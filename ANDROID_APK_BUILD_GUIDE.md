# 📱 Android APK 构建指南

> 如何手动构建 Android APK

**创建时间**: 2026-03-19

---

## 🎯 方案选择

### 方案 1：GitHub Actions (推荐)

**优点**:
- ✅ 无需本地环境
- ✅ 自动上传到 Release
- ✅ 可重复构建

**访问**: https://github.com/11suixing11/mindnotes-pro/actions/workflows/release-android-prebuilt.yml

---

### 方案 2：本地构建

**前提条件**:
- Node.js 22+
- Java 17+
- Android SDK (可选)

**步骤**:

```bash
# 1. 安装依赖
npm install

# 2. 构建 web 资源
npm run build

# 3. 同步 Capacitor
npx cap sync android

# 4. 构建 APK
cd android
chmod +x gradlew
./gradlew assembleRelease

# 5. 查找 APK
find app/build/outputs -name "*.apk"
```

**APK 位置**:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

### 方案 3：使用 PWA

**访问**: https://mindnotes-pro.vercel.app

**添加到主屏幕**:
1. Chrome 打开网站
2. 菜单 → "添加到主屏幕"
3. 像原生应用一样使用

---

## 🐛 常见问题

### Java 版本不对

**错误**:
```
Android Gradle plugin requires Java 17
```

**解决**:
```bash
# macOS
brew install openjdk@17

# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# 设置 JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### Gradle 构建慢

**解决**: 使用 Gradle 缓存
```bash
./gradlew assembleRelease --build-cache
```

### APK 找不到

**检查**:
```bash
find android/app/build/outputs -name "*.apk"
```

---

## 📦 手动上传到 Release

1. 访问：https://github.com/11suixing11/mindnotes-pro/releases/tag/v1.1.3
2. 点击 "Edit"
3. 拖拽 APK 文件到上传区域
4. 点击 "Update release"

---

**最后更新**: 2026-03-19
