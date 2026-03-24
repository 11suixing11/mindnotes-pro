package com.mindnotes.pro;

import android.app.Application;
import android.util.Log;
import androidx.appcompat.app.AppCompatDelegate;

/**
 * MindNotes Pro Application 类
 * 
 * 现代 Android 应用架构:
 * - 使用 Java 编写 (保持兼容性)
 * - 遵循 MVVM 架构
 * - 使用 ViewModel + LiveData
 * - 支持深色模式
 */
public class MindNotesApplication extends Application {
    
    private static final String TAG = "MindNotes";
    private static MindNotesApplication instance;
    
    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        
        // 初始化应用配置
        initAppConfig();
        
        Log.d(TAG, "MindNotes Pro Application initialized");
    }
    
    /**
     * 初始化应用配置
     */
    private void initAppConfig() {
        // 启用深色模式支持
        AppCompatDelegate.setDefaultNightMode(
            AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        );
    }
    
    /**
     * 获取应用实例
     */
    public static MindNotesApplication getInstance() {
        return instance;
    }
    
    /**
     * 获取应用版本信息
     */
    public String getAppVersion() {
        try {
            var packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            return packageInfo.versionName != null ? packageInfo.versionName : "1.3.2";
        } catch (Exception e) {
            return "1.3.2";
        }
    }
}
