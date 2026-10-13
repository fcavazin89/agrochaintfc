# Teste 1: WASM acessível?
$w = Invoke-WebRequest -Uri 'http://localhost:8000/blockchain/circuits/agrochain-score-threshold_js/agrochain-score-threshold.wasm' -Method Head -ErrorAction SilentlyContinue
Write-Host 'WASM:' $w.StatusCode $w.Headers.'Content-Type' '(' ($w.Headers.'Content-Length'/1KB) 'KB)'

# Teste 2: ZKEY acessível?
$z = Invoke-WebRequest -Uri 'http://localhost:8000/blockchain/circuits/agrochain-score-threshold_final.zkey' -Method Head -ErrorAction SilentlyContinue
Write-Host 'ZKEY:' $z.StatusCode $z.Headers.'Content-Type' '(' ([int]$z.Headers.'Content-Length'/1KB) 'KB)'

# Teste 3: Verification Key acessível?
$v = Invoke-WebRequest -Uri 'http://localhost:8000/blockchain/circuits/verification_key.json' -Method Head -ErrorAction SilentlyContinue
Write-Host 'VK:  ' $v.StatusCode $v.Headers.'Content-Type'

# Teste 4: Certificador HTML
$c = Invoke-WebRequest -Uri 'http://localhost:8000/certificador.html' -Method Head -ErrorAction SilentlyContinue
Write-Host 'HTML:' $c.StatusCode $c.Headers.'Content-Type'
