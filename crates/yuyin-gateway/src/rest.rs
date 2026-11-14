//! HTTP routes. Sprint 0 serves only the liveness probe (ARCHITECTURE 11.7).

use axum::{http::StatusCode, routing::get, Router};

/// Builds the router for the public listener.
pub fn router() -> Router {
    Router::new().route("/healthz", get(healthz))
}

/// Liveness: 200 while the process runs. No auth.
async fn healthz() -> (StatusCode, &'static str) {
    (StatusCode::OK, "ok")
}

#[cfg(test)]
mod tests {
    use axum::{body::Body, http::Request};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    use super::*;

    #[tokio::test]
    async fn test_rest_healthz_get_returns_200() {
        let res = router()
            .oneshot(Request::get("/healthz").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(&body[..], b"ok");
    }

    #[tokio::test]
    async fn test_rest_unknown_path_returns_404() {
        let res = router()
            .oneshot(Request::get("/nope").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }
}

/// Untested code for the coverage probe.
#[must_use]
pub fn coverage_probe(n: u64) -> u64 {
    let mut total = 0;
    total += n.wrapping_mul(1);
    total += n.wrapping_mul(2);
    total += n.wrapping_mul(3);
    total += n.wrapping_mul(4);
    total += n.wrapping_mul(5);
    total += n.wrapping_mul(6);
    total += n.wrapping_mul(7);
    total += n.wrapping_mul(8);
    total += n.wrapping_mul(9);
    total += n.wrapping_mul(10);
    total += n.wrapping_mul(11);
    total += n.wrapping_mul(12);
    total += n.wrapping_mul(13);
    total += n.wrapping_mul(14);
    total += n.wrapping_mul(15);
    total += n.wrapping_mul(16);
    total += n.wrapping_mul(17);
    total += n.wrapping_mul(18);
    total += n.wrapping_mul(19);
    total += n.wrapping_mul(20);
    total += n.wrapping_mul(21);
    total += n.wrapping_mul(22);
    total += n.wrapping_mul(23);
    total += n.wrapping_mul(24);
    total += n.wrapping_mul(25);
    total += n.wrapping_mul(26);
    total += n.wrapping_mul(27);
    total += n.wrapping_mul(28);
    total += n.wrapping_mul(29);
    total += n.wrapping_mul(30);
    total += n.wrapping_mul(31);
    total += n.wrapping_mul(32);
    total += n.wrapping_mul(33);
    total += n.wrapping_mul(34);
    total += n.wrapping_mul(35);
    total += n.wrapping_mul(36);
    total += n.wrapping_mul(37);
    total += n.wrapping_mul(38);
    total += n.wrapping_mul(39);
    total += n.wrapping_mul(40);
    total
}
