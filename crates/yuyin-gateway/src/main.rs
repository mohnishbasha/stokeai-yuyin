//! Yuyin gateway entry point.
//!
//! Sprint 0 placeholder: `serve` answers `/healthz`. The speech API arrives in Sprint 3.

#![forbid(unsafe_code)]

mod admission;
mod auth;
mod config;
mod drain;
mod errors;
mod metrics;
mod rest;
mod usage;
mod voices;
mod ws;

use std::future::Future;

use clap::{Parser, Subcommand};
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

/// Version and commit reported by `--version` (`YUYIN_GIT_SHA` is set at build time).
const LONG_VERSION: &str = concat!(env!("CARGO_PKG_VERSION"), " (", env!("YUYIN_GIT_SHA"), ")");

#[derive(Debug, Parser)]
#[command(name = "yuyin-gateway", version = LONG_VERSION, about = "Yuyin speech gateway")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Run the HTTP server (default).
    Serve(config::ServeConfig),
    /// Probe `/healthz` on the local server and exit non-zero if it is not 200.
    /// Used as the container health check because the image has no shell or curl.
    Healthcheck(config::ServeConfig),
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();
    let cli = Cli::parse();
    if let Some(Command::Healthcheck(cfg)) = &cli.command {
        return healthcheck(cfg.bind).await;
    }
    let shutdown = shutdown_signal()?;
    run(cli, shutdown).await
}

/// Seconds to wait for the health probe before reporting failure.
const HEALTHCHECK_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(3);

/// Requests `/healthz` from the server bound to `bind` and succeeds only on a 200 response.
/// A wildcard bind address (0.0.0.0 or ::) is probed through loopback.
async fn healthcheck(bind: std::net::SocketAddr) -> anyhow::Result<()> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let mut target = bind;
    if target.ip().is_unspecified() {
        target.set_ip(match target {
            std::net::SocketAddr::V4(_) => std::net::Ipv4Addr::LOCALHOST.into(),
            std::net::SocketAddr::V6(_) => std::net::Ipv6Addr::LOCALHOST.into(),
        });
    }
    let probe = async {
        let mut stream = tokio::net::TcpStream::connect(target).await?;
        stream
            .write_all(b"GET /healthz HTTP/1.1\r\nHost: healthcheck\r\nConnection: close\r\n\r\n")
            .await?;
        let mut response = String::new();
        stream.read_to_string(&mut response).await?;
        anyhow::Ok(response)
    };
    let response = tokio::time::timeout(HEALTHCHECK_TIMEOUT, probe).await??;
    anyhow::ensure!(
        response.starts_with("HTTP/1.1 200"),
        "unhealthy: {}",
        response.lines().next().unwrap_or("empty response")
    );
    Ok(())
}

/// Logs to stderr, filtered by `RUST_LOG` (default `info`). A second call is a no-op.
fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .try_init();
}

/// Binds the configured address and serves until `shutdown` resolves.
async fn run(cli: Cli, shutdown: impl Future<Output = ()> + Send + 'static) -> anyhow::Result<()> {
    let cfg = serve_config(cli);
    let listener = TcpListener::bind(cfg.bind).await?;
    serve(listener, shutdown).await
}

/// Serves the router on `listener` until `shutdown` resolves.
async fn serve(
    listener: TcpListener,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> anyhow::Result<()> {
    tracing::info!(bind = %listener.local_addr()?, version = LONG_VERSION, "gateway listening");
    axum::serve(listener, rest::router())
        .with_graceful_shutdown(shutdown)
        .await?;
    Ok(())
}

/// `serve` is the default subcommand.
fn serve_config(cli: Cli) -> config::ServeConfig {
    match cli.command {
        Some(Command::Serve(cfg) | Command::Healthcheck(cfg)) => cfg,
        None => config::ServeConfig::parse_from(["serve"]),
    }
}

/// Registers the Ctrl-C and SIGTERM handlers now and returns a future that resolves on
/// either. Draining arrives in Sprint 3.
fn shutdown_signal() -> std::io::Result<impl Future<Output = ()>> {
    #[cfg(unix)]
    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())?;
    Ok(async move {
        let ctrl_c = async {
            if tokio::signal::ctrl_c().await.is_err() {
                std::future::pending::<()>().await;
            }
        };
        #[cfg(unix)]
        let term = async move {
            term.recv().await;
        };
        #[cfg(not(unix))]
        let term = std::future::pending::<()>();
        tokio::select! {
            () = ctrl_c => {},
            () = term => {},
        }
        tracing::info!("shutdown signal received");
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main_version_includes_package_version() {
        assert!(LONG_VERSION.starts_with(env!("CARGO_PKG_VERSION")));
    }

    #[test]
    fn test_main_cli_no_subcommand_parses() {
        let cli = Cli::try_parse_from(["yuyin-gateway"]).unwrap();
        assert!(cli.command.is_none());
    }

    #[test]
    fn test_main_serve_config_no_subcommand_uses_default_bind() {
        let cli = Cli::try_parse_from(["yuyin-gateway"]).unwrap();
        assert_eq!(serve_config(cli).bind.to_string(), config::DEFAULT_BIND);
    }

    #[test]
    fn test_main_serve_config_bind_flag_overrides_default() {
        let cli = Cli::try_parse_from(["yuyin-gateway", "serve", "--bind", "127.0.0.1:9"]).unwrap();
        assert_eq!(serve_config(cli).bind.to_string(), "127.0.0.1:9");
    }

    #[tokio::test]
    async fn test_main_serve_healthz_then_shutdown_returns_ok() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        let server = tokio::spawn(serve(listener, async {
            let _ = rx.await;
        }));
        let mut stream = tokio::net::TcpStream::connect(addr).await.unwrap();
        stream
            .write_all(b"GET /healthz HTTP/1.1\r\nHost: test\r\nConnection: close\r\n\r\n")
            .await
            .unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).await.unwrap();
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
        tx.send(()).unwrap();
        server.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn test_main_healthcheck_healthy_server_returns_ok() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        let server = tokio::spawn(serve(listener, async {
            let _ = rx.await;
        }));
        healthcheck(addr).await.unwrap();
        tx.send(()).unwrap();
        server.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn test_main_healthcheck_wildcard_bind_probes_loopback() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        let server = tokio::spawn(serve(listener, async {
            let _ = rx.await;
        }));
        healthcheck(std::net::SocketAddr::from(([0, 0, 0, 0], port)))
            .await
            .unwrap();
        tx.send(()).unwrap();
        server.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn test_main_healthcheck_wildcard_v6_bind_targets_v6_loopback() {
        // Nothing listens on the port, so the probe fails; the point is that it does not hang.
        let bind = std::net::SocketAddr::from((std::net::Ipv6Addr::UNSPECIFIED, 1));
        assert!(healthcheck(bind).await.is_err());
    }

    #[tokio::test]
    async fn test_main_healthcheck_nothing_listening_returns_error() {
        let taken = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = taken.local_addr().unwrap();
        drop(taken);
        assert!(healthcheck(addr).await.is_err());
    }

    #[tokio::test]
    async fn test_main_healthcheck_non_200_returns_error() {
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            let (mut conn, _) = listener.accept().await.unwrap();
            let mut buf = [0u8; 64];
            let _ = conn.read(&mut buf).await;
            conn.write_all(b"HTTP/1.1 503 Service Unavailable\r\n\r\n")
                .await
                .unwrap();
        });
        let err = healthcheck(addr).await.unwrap_err();
        assert!(err.to_string().contains("503"), "{err}");
    }

    #[tokio::test]
    async fn test_main_healthcheck_silent_server_returns_error() {
        use tokio::io::AsyncReadExt;
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            let (mut conn, _) = listener.accept().await.unwrap();
            let mut buf = [0u8; 64];
            let _ = conn.read(&mut buf).await;
        });
        let err = healthcheck(addr).await.unwrap_err();
        assert!(err.to_string().contains("empty response"), "{err}");
    }

    #[test]
    fn test_main_cli_healthcheck_subcommand_parses_bind() {
        let cli =
            Cli::try_parse_from(["yuyin-gateway", "healthcheck", "--bind", "127.0.0.1:9"]).unwrap();
        assert_eq!(serve_config(cli).bind.to_string(), "127.0.0.1:9");
    }

    #[tokio::test]
    async fn test_main_run_shutdown_ready_returns_ok() {
        init_tracing();
        init_tracing();
        let cli = Cli::try_parse_from(["yuyin-gateway", "serve", "--bind", "127.0.0.1:0"]).unwrap();
        run(cli, std::future::ready(())).await.unwrap();
    }

    #[tokio::test]
    async fn test_main_run_address_in_use_returns_error() {
        let taken = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = taken.local_addr().unwrap().to_string();
        let cli = Cli::try_parse_from(["yuyin-gateway", "serve", "--bind", &addr]).unwrap();
        assert!(run(cli, std::future::pending()).await.is_err());
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn test_main_shutdown_signal_sigterm_resolves() {
        let shutdown = shutdown_signal().unwrap();
        let status = std::process::Command::new("kill")
            .args(["-TERM", &std::process::id().to_string()])
            .status()
            .unwrap();
        assert!(status.success());
        tokio::time::timeout(std::time::Duration::from_secs(5), shutdown)
            .await
            .unwrap();
    }
}
