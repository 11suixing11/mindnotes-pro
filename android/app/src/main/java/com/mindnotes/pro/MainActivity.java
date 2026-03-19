package com.mindnotes.pro;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

/**
 * MindNotes Pro 主界面
 * 
 * 现代 Android 最佳实践:
 * - 使用 SplashScreen API (Android 12+)
 * - 支持深色模式
 * - 轻量简洁
 */
public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 显示启动画面 (Android 12+)
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 配置深色模式
        setAppBarConfiguration(null);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // 初始化应用
        MindNotesApplication.getInstance();
    }
}
