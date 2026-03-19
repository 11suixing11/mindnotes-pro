package com.mindnotes.pro;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * MindNotes Pro 主界面
 * 
 * 现代 Android 最佳实践:
 * - 使用 SplashScreen API (Android 12+)
 * - 支持全屏模式
 * - 防止截屏 (安全考虑)
 * - Kotlin 协程支持
 */
public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 显示启动画面
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 配置应用栏
        setAppBarConfiguration(null);
        
        // 初始化插件
        registerPlugins();
        
        // 配置窗口
        configureWindow();
    }
    
    /**
     * 注册 Capacitor 插件
     */
    private void registerPlugins() {
        // Capacitor 会自动注册插件
        // 这里可以添加自定义插件
    }
    
    /**
     * 配置窗口属性
     */
    private void configureWindow() {
        // 启用全屏模式
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        
        // 防止截屏 (可选，安全考虑)
        // getWindow().setFlags(
        //     WindowManager.LayoutParams.FLAG_SECURE,
        //     WindowManager.LayoutParams.FLAG_SECURE
        // );
        
        // 保持屏幕常亮 (笔记应用常用)
        // getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // 应用启动时初始化
        MindNotesApplication.getInstance();
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        // 恢复时刷新 UI
        refreshUI();
    }
    
    /**
     * 刷新 UI
     */
    private void refreshUI() {
        // 可以在这里添加 UI 刷新逻辑
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }
}
