package com.DoktorumAI

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.zoontek.rnbootsplash.RNBootSplash   //  🔑

class MainActivity : ReactActivity() {

  /** RN ana bileşen adı */
  override fun getMainComponentName(): String = "DoktorumAI"

  /** New-Architecture desteği */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /** BootSplash’i başlat – super.onCreate’den ÖNCE */
  override fun onCreate(savedInstanceState: Bundle?) {
    RNBootSplash.init(this)            //  👈  zorunlu satır
    super.onCreate(savedInstanceState)
  }
}