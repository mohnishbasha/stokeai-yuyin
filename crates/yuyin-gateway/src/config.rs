//! Gateway configuration read from the environment (ARCHITECTURE section 18).

use std::net::SocketAddr;

use clap::Parser;

/// Default bind address for development (ARCHITECTURE section 18, `YUYIN_BIND`).
pub const DEFAULT_BIND: &str = "127.0.0.1:8080";

/// Settings for `serve`. Each field is also read from its environment variable.
#[derive(Debug, Clone, Parser)]
pub struct ServeConfig {
    /// Address the public API listens on.
    #[arg(long, env = "YUYIN_BIND", default_value = DEFAULT_BIND)]
    pub bind: SocketAddr,
}
