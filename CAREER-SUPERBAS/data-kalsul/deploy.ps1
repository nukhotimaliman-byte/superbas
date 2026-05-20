# Deploy Data KalSul to super-bas.com
$baseUrl = "https://super-bas.com/patch-deploy.php?token=bas2026"
$baseDir = "c:\ALIM\BAS-ALIM\CAREER-SUPERBAS\data-kalsul"

$files = @(
    # Built frontend (dist/)
    @{ local = "$baseDir\dist\index.html";                remote = "data-kalsul/index.html" }
    @{ local = "$baseDir\dist\assets\index-CzJx3IqB.css"; remote = "data-kalsul/assets/index-CzJx3IqB.css" }
    @{ local = "$baseDir\dist\assets\index-JS-S2dio.js";  remote = "data-kalsul/assets/index-JS-S2dio.js" }
    # .htaccess (SPA routing)
    @{ local = "$baseDir\.htaccess";                      remote = "data-kalsul/.htaccess" }
    # API files
    @{ local = "$baseDir\api\config.php";                 remote = "data-kalsul/api/config.php" }
    @{ local = "$baseDir\api\auth.php";                   remote = "data-kalsul/api/auth.php" }
    @{ local = "$baseDir\api\employees.php";              remote = "data-kalsul/api/employees.php" }
    @{ local = "$baseDir\api\upload.php";                 remote = "data-kalsul/api/upload.php" }
    @{ local = "$baseDir\api\gaji-status.php";            remote = "data-kalsul/api/gaji-status.php" }
    @{ local = "$baseDir\api\export.php";                 remote = "data-kalsul/api/export.php" }
    @{ local = "$baseDir\api\.htaccess";                  remote = "data-kalsul/api/.htaccess" }
    # SQL setup
    @{ local = "$baseDir\setup.sql";                      remote = "data-kalsul/setup.sql" }
)

$success = 0; $errors = 0
Write-Host "=== Deploying Data KalSul ($($files.Count) files) ===" -ForegroundColor Cyan

foreach ($f in $files) {
    Write-Host -NoNewline "  $($f.remote) ... "
    try {
        $form = [System.Net.Http.MultipartFormDataContent]::new()
        $fileBytes = [System.IO.File]::ReadAllBytes($f.local)
        $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
        $fileName = [System.IO.Path]::GetFileName($f.local)
        $form.Add($fileContent, "file", $fileName)
        $form.Add([System.Net.Http.StringContent]::new($f.remote), "path")
        
        $handler = [System.Net.Http.HttpClientHandler]::new()
        $handler.ServerCertificateCustomValidationCallback = { $true }
        $client = [System.Net.Http.HttpClient]::new($handler)
        $client.Timeout = [TimeSpan]::FromSeconds(30)
        $response = $client.PostAsync($baseUrl, $form).Result
        $body = $response.Content.ReadAsStringAsync().Result
        
        if ($response.IsSuccessStatusCode) {
            Write-Host "OK" -ForegroundColor Green
            $success++
        } else {
            Write-Host "FAIL ($($response.StatusCode))" -ForegroundColor Red
            $errors++
        }
        $client.Dispose()
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n=== Deploy Complete: $success OK, $errors errors ===" -ForegroundColor Cyan
Write-Host "URL: https://super-bas.com/data-kalsul/" -ForegroundColor Yellow
