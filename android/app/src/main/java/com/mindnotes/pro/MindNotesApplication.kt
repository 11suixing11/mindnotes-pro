package com.mindnotes.pro

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatDelegate

/**
 * MindNotes Pro Application 类
 * 
 * 现代 Android 应用架构:
 * - 使用 Kotlin 编写
 * - 遵循 MVVM 架构
 * - 使用 ViewModel + LiveData
 * - 支持深色模式
 */
class MindNotesApplication : Application() {
    
    companion object {
        const val TAG = "MindNotes"
        lateinit var instance: MindNotesApplication
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        
        // 初始化应用配置
        initAppConfig()
        
        Log.d(TAG, "MindNotes Pro Application initialized")
    }
    
    /**
     * 初始化应用配置
     */
    private fun initAppConfig() {
        // 启用深色模式支持
        AppCompatDelegate.setDefaultNightMode(
            AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        )
    }
    
    /**
     * 获取应用版本信息
     */
    fun getAppVersion(): String {
        return try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            packageInfo.versionName ?: "1.1.3"
        } catch (e: Exception) {
            "1.1.3"
        }
    }
}
