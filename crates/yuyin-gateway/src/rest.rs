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
