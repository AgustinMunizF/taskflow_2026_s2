# Pruebas de seguridad del Modulo 2 - Clase 12
# Uso (con la API levantada):  powershell -ExecutionPolicy Bypass -File security\checks.ps1

$API = "http://localhost:3000/api"

function Login($email) {
  $body = @{ email = $email; password = "Password1" } | ConvertTo-Json -Compress
  (Invoke-RestMethod -Method Post -Uri "$API/auth/login" -ContentType "application/json" -Body $body).token
}

function Estado($metodo, $url, $token, $body) {
  $headers = @{ Authorization = "Bearer $token" }
  try {
    $r = Invoke-WebRequest -Method $metodo -Uri $url -Headers $headers -ContentType "application/json" -Body $body -UseBasicParsing
    return $r.StatusCode
  } catch { return $_.Exception.Response.StatusCode.value__ }
}

function EstadoSinToken($metodo, $url, $body) {
  try {
    $r = Invoke-WebRequest -Method $metodo -Uri $url -ContentType "application/json" -Body $body -UseBasicParsing
    return $r.StatusCode
  } catch { return $_.Exception.Response.StatusCode.value__ }
}

Write-Host "`n=== 1. Tokens ===" -ForegroundColor Cyan
$TOKEN_A = Login "ana@test.com"
$TOKEN_B = Login "bob@test.com"
Write-Host ("Ana: " + $TOKEN_A.Substring(0,25) + "...")
Write-Host ("Bob: " + $TOKEN_B.Substring(0,25) + "...")

Write-Host "`n=== 2. Ana crea un proyecto privado con una tarea ===" -ForegroundColor Cyan
$headersA = @{ Authorization = "Bearer $TOKEN_A" }
$proy = Invoke-RestMethod -Method Post -Uri "$API/projects" -Headers $headersA -ContentType "application/json" -Body (@{ name = "Privado seguridad $(Get-Date -Format yyyyMMdd-HHmmss)" } | ConvertTo-Json -Compress)
$tarea = Invoke-RestMethod -Method Post -Uri "$API/projects/$($proy.id)/tasks" -Headers $headersA -ContentType "application/json" -Body '{"title":"Tarea privada de Ana","priority":"HIGH"}'
Write-Host "Proyecto: $($proy.id)   Tarea: $($tarea.id)"

Write-Host "`n=== 3. Control de acceso: Bob contra los datos de Ana ===" -ForegroundColor Cyan
Write-Host ("Bob lista las tareas del proyecto  -> " + (Estado "GET" "$API/projects/$($proy.id)/tasks" $TOKEN_B $null) + "   (esperado 403)")
Write-Host ("Bob lee la tarea                   -> " + (Estado "GET" "$API/tasks/$($tarea.id)" $TOKEN_B $null) + "   (esperado 403)")
Write-Host ("Bob EDITA la tarea                 -> " + (Estado "PATCH" "$API/tasks/$($tarea.id)" $TOKEN_B '{"title":"Alterado por un usuario ajeno"}') + "   (esperado 403)")
Write-Host ("Bob BORRA la tarea                 -> " + (Estado "DELETE" "$API/tasks/$($tarea.id)" $TOKEN_B $null) + "   (esperado 403)")

Write-Host "`n=== 4. Inyeccion SQL ===" -ForegroundColor Cyan
$payload = "' OR '1'='1' --"
$bodyIny = @{ email = $payload; password = "x" } | ConvertTo-Json -Compress
$estadoIny = EstadoSinToken "POST" "$API/auth/login" $bodyIny
Write-Host ("Login con payload de inyeccion     -> $estadoIny   (esperado 400 o 401, nunca 200)")
$busq = Invoke-RestMethod -Method Get -Uri "$API/projects/$($proy.id)/tasks?search=$([uri]::EscapeDataString($payload))" -Headers $headersA
Write-Host ("Busqueda con payload: $($busq.total) resultado(s)   (esperado 0: lo busca como texto literal)")

Write-Host "`n=== 5. Token sin firma (alg: none) ===" -ForegroundColor Cyan
$h = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"alg":"none","typ":"JWT"}')).TrimEnd('=').Replace('+','-').Replace('/','_')
$p = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{"userId":1,"email":"ana@test.com"}')).TrimEnd('=').Replace('+','-').Replace('/','_')
Write-Host ("Peticion con token sin firma       -> " + (Estado "GET" "$API/projects" "$h.$p." $null) + "   (esperado 401)")

Write-Host "`n=== 6. Headers de seguridad ===" -ForegroundColor Cyan
$interes = @("Content-Security-Policy","Strict-Transport-Security","X-Frame-Options","X-Content-Type-Options","X-Powered-By","Access-Control-Allow-Origin")

function MostrarHeaders($titulo, $respuesta) {
  Write-Host "`n-- $titulo"
  foreach ($nombre in $interes) {
    $valor = $respuesta.Headers[$nombre]
    if ($valor) { Write-Host ("{0,-28} -> {1}" -f $nombre, $valor) } else { Write-Host ("{0,-28} -> (no aparece)" -f $nombre) }
  }
}

MostrarHeaders "Endpoint publico: /api/health" (Invoke-WebRequest -Uri "$API/health" -UseBasicParsing)
MostrarHeaders "Endpoint protegido: /api/projects" (Invoke-WebRequest -Uri "$API/projects" -Headers $headersA -UseBasicParsing)
Write-Host ""
