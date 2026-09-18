<?php
// Compatibility shim for the copilot endpoints. Data APIs no longer proxy
// upstream; copilot.php and its diagnostics retain their existing contract.
require_once __DIR__ . '/_data.php';
function proxy_upstream(string $endpoint): never {
    api_init();
    api_json(['status'=>'error','message'=>'This endpoint is not available in standalone PHP mode'], 503);
}
