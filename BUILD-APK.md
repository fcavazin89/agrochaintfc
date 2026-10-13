# 📱 Build APK AgroChain com Web3

Guia completo para gerar o APK do AgroChain com certificador Web3 integrado.

## 🎯 O que será criado

**APK Android** com:
- ✅ Protótipo completo AgroChain (todas as 16 telas)
- ✅ Certificador Web3 integrado
- ✅ Suporte a MetaMask mobile (WalletConnect)
- ✅ Prova ZK (snarkjs)
- ✅ Interface nativa Android
- ✅ Splash screen
- ✅ Ícone personalizado
- ✅ Status bar customizada

## 📋 Pré-requisitos

### 1. **Java JDK 17+**
```powershell
# Verificar instalação
java -version

# Se não tiver, baixe:
# https://adoptium.net/temurin/releases/
```

### 2. **Android Studio**
```
Baixe: https://developer.android.com/studio
Instale com:
- Android SDK
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android Emulator (opcional)
```

### 3. **Gradle**
Android Studio já inclui Gradle, mas configure ANDROID_HOME:

```powershell
# Adicione ao Path do sistema:
$env:ANDROID_HOME = "C:\Users\Usuário\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\tools"
```

### 4. **Node.js 18+** (já instalado)
```powershell
node --version  # 18+
npm --version   # 9+
```

## 🚀 Instalação e Setup

### Passo 1: Instalar dependências

```powershell
# No diretório do projeto
cd "c:\Users\Usuário\agrochain\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip"

# Instalar dependências (pode demorar 5-10 min)
npm install
```

**Se houver erro de conectividade** (package-firewall.replit.internal):
```powershell
# Configure o registro npm para usar registry oficial
npm config set registry https://registry.npmjs.org/

# Depois reinstale
npm install
```

### Passo 2: Inicializar projeto Android

```powershell
# Adicionar plataforma Android
npm run android:init

# Isso cria o diretório /android com:
# - AndroidManifest.xml
# - build.gradle
# - Estrutura de projeto Android
```

### Passo 3: Sincronizar código web com Android

```powershell
# Copiar arquivos do prototipo-agrochain/ para Android
npm run android:sync
```

## 🎨 Personalização (Opcional)

### Ícone do App

1. Crie um ícone 1024x1024 PNG
2. Salve em: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
3. Ou use ferramenta online: https://icon.kitchen

### Splash Screen

Edite `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">
    <item name="android:background">@drawable/splash</item>
</style>
```

E adicione imagem em `android/app/src/main/res/drawable/splash.png`

### Nome do App

Edite `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">AgroChain</string>
<string name="title_activity_main">AgroChain Web3</string>
```

## 🔨 Build do APK

### Opção 1: Debug APK (Mais Rápido)

```powershell
# Build versão de debug (não assinada)
npm run android:build

# APK gerado em:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Opção 2: Release APK (Para Distribuição)

#### 2.1 Criar keystore (primeira vez)

```powershell
# Gerar chave de assinatura
keytool -genkey -v -keystore agrochain-release-key.jks `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias agrochain-key

# Responda as perguntas:
# - Password: [sua senha]
# - Nome: AgroChain
# - Organization: [sua organização]
# - etc.

# Salve a senha em local seguro!
```

#### 2.2 Configurar assinatura

Edite `android/gradle.properties`:
```properties
AGROCHAIN_RELEASE_STORE_FILE=../../agrochain-release-key.jks
AGROCHAIN_RELEASE_KEY_ALIAS=agrochain-key
AGROCHAIN_RELEASE_STORE_PASSWORD=SUA_SENHA_AQUI
AGROCHAIN_RELEASE_KEY_PASSWORD=SUA_SENHA_AQUI
```

Edite `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(AGROCHAIN_RELEASE_STORE_FILE)
            storePassword AGROCHAIN_RELEASE_STORE_PASSWORD
            keyAlias AGROCHAIN_RELEASE_KEY_ALIAS
            keyPassword AGROCHAIN_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 2.3 Build release

```powershell
# Build versão release (assinada)
npm run android:release

# APK gerado em:
# android/app/build/outputs/apk/release/app-release.apk
```

## 📦 Instalação do APK

### No dispositivo físico:

```powershell
# 1. Habilite "Instalação de fontes desconhecidas" no Android
# 2. Copie o APK para o dispositivo (USB, email, etc)
# 3. Abra o APK e instale
```

### Via ADB (USB ou WiFi):

```powershell
# Conecte dispositivo via USB
# Habilite "Depuração USB" no Android

# Instalar APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Ou versão release
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 🌐 Web3 no Mobile

### MetaMask Mobile

O certificador Web3 funciona com MetaMask mobile via **WalletConnect**:

1. Usuário abre o app AgroChain
2. Na tela Certificador, clica "Conectar"
3. App detecta ambiente mobile
4. Exibe QR Code WalletConnect
5. Usuário escaneia com MetaMask mobile
6. Conexão estabelecida
7. Transações assinadas pelo MetaMask

### Configuração WalletConnect

Já incluído no `11_web3.js`, mas para customizar:

```javascript
// Em 11_web3.js, adicione:
import WalletConnectProvider from "@walletconnect/web3-provider";

const provider = new WalletConnectProvider({
  rpc: {
    11155111: "https://sepolia.infura.io/v3/YOUR_KEY"
  }
});

await provider.enable();
```

## 📊 Tamanho do APK

| Versão | Tamanho Estimado |
|--------|------------------|
| Debug | ~25 MB |
| Release (não minificada) | ~20 MB |
| Release (minificada) | ~15 MB |

## 🐛 Troubleshooting

### "npm install" falha

```powershell
# Limpar cache
npm cache clean --force

# Configurar registry
npm config set registry https://registry.npmjs.org/

# Reinstalar
npm install
```

### "ANDROID_HOME not found"

```powershell
# Configure variável de ambiente
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\Usuário\AppData\Local\Android\Sdk', [System.EnvironmentVariableTarget]::User)

# Reinicie PowerShell
```

### "Gradle build failed"

```powershell
# Abra Android Studio
npm run android:open

# Deixe Android Studio sincronizar e baixar dependências
# Depois tente build novamente
```

### "APK não instala"

- Verifique se "Fontes desconhecidas" está habilitado
- Para release APK, certifique-se de assinar corretamente
- Tente via `adb install -r` (reinstalação forçada)

### Web3 não conecta

- Certifique-se de que MetaMask mobile está instalado
- Use WalletConnect para conexão mobile-to-mobile
- Teste em ambiente de rede local primeiro

## 🎯 Checklist Final

Antes de distribuir o APK:

- [ ] Testado em dispositivo físico
- [ ] Web3 conecta com MetaMask mobile
- [ ] Todas as telas carregam corretamente
- [ ] Certificador emite certificação (simulada)
- [ ] Splash screen exibe corretamente
- [ ] Ícone aparece no launcher
- [ ] Status bar customizada (escura)
- [ ] Rotação de tela funciona
- [ ] Back button navega corretamente

## 📤 Distribuição

### Google Play Store (Produção)

1. Crie conta no Google Play Console
2. Pague taxa de $25 (one-time)
3. Crie novo aplicativo
4. Faça upload do APK/AAB assinado
5. Preencha metadados (descrição, screenshots)
6. Submeta para revisão

### Distribuição Direta (Beta/Teste)

- **Email/WhatsApp**: Envie APK diretamente
- **Google Drive**: Compartilhe link
- **Firebase App Distribution**: Serviço gratuito do Google
- **APKPure/F-Droid**: Lojas alternativas

## 🔗 Links Úteis

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio
- **WalletConnect**: https://walletconnect.com
- **MetaMask Mobile**: https://metamask.io/download/
- **Icon Kitchen**: https://icon.kitchen
- **Firebase App Distribution**: https://firebase.google.com/products/app-distribution

## 📝 Próximos Passos

Após gerar o APK:

1. **Teste em múltiplos dispositivos** (diferentes versões Android)
2. **Otimize performance** (minify, obfuscate)
3. **Adicione analytics** (Firebase, Sentry)
4. **Implemente push notifications** (Firebase Cloud Messaging)
5. **Adicione deep links** (agrochain://certificate/123)
6. **Versione corretamente** (versionCode, versionName)
7. **Publique na Play Store**

---

## 🚀 Comando Rápido (TL;DR)

```powershell
# Setup completo
npm install
npm run android:init
npm run android:sync

# Build APK debug
npm run android:build

# APK em: android/app/build/outputs/apk/debug/app-debug.apk

# Instalar via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

**AgroChain Mobile © 2026** • Certificação agrícola na palma da sua mão 📱🌱
