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

use clap::{Parser, Subcommand};
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
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();
    let cli = Cli::parse();
    let serve = match cli.command {
        Some(Command::Serve(cfg)) => cfg,
        None => config::ServeConfig::parse_from(["serve"]),
    };
    let listener = tokio::net::TcpListener::bind(serve.bind).await?;
    tracing::info!(bind = %serve.bind, version = LONG_VERSION, "gateway listening");
    axum::serve(listener, rest::router())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Resolves on Ctrl-C or SIGTERM. Draining arrives in Sprint 3.
async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let term = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut s) => {
                s.recv().await;
            }
            Err(e) => {
                tracing::warn!(error = %e, "cannot listen for SIGTERM");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<()>();
    tokio::select! {
        () = ctrl_c => {},
        () = term => {},
    }
    tracing::info!("shutdown signal received");
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
}
