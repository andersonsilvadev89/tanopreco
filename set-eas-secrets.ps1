# set-eas-secrets.ps1
# Script para enviar todas as variáveis do .env como secrets no EAS

# Caminho do seu arquivo .env
$envFilePath = ".env"

if (-not (Test-Path $envFilePath)) {
    Write-Host "Arquivo .env não encontrado no diretório atual."
    exit 1
}

# Lê cada linha do .env
Get-Content $envFilePath | ForEach-Object {
    $line = $_.Trim()

    # Ignora linhas vazias ou comentários
    if ($line -eq "" -or $line.StartsWith("#")) {
        return
    }

    # Divide a linha no formato NOME=VALOR
    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim('"', " ")

        Write-Host "Criando secret: $name"

        # Cria o secret no EAS
        eas secret:create --name $name --value $value --type string | Out-Null
    }
}

Write-Host "Todos os secrets foram enviados para o EAS com sucesso!"
