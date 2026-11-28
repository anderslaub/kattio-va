package io.github.anderslaub.kattio.car

import android.content.Intent
import android.content.pm.ApplicationInfo
import androidx.car.app.AppManager
import androidx.car.app.CarAppService
import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.Session
import androidx.car.app.model.Action
import androidx.car.app.model.ActionStrip
import androidx.car.app.model.CarColor
import androidx.car.app.model.CarIcon
import androidx.car.app.model.Template
import androidx.car.app.navigation.model.NavigationTemplate
import androidx.car.app.validation.HostValidator
import androidx.core.graphics.drawable.IconCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import io.github.anderslaub.kattio.R

/**
 * Kattio on the car's screen (Android Auto). Android Auto only lets navigation apps draw their own picture, so this is
 * declared as one (it doesn't navigate): the face and the conversation are drawn on the map's surface, and the
 * action strip has the Talk button. Opening Kattio in the car starts a conversation.
 */
class KattioCarService : CarAppService() {
  override fun createHostValidator(): HostValidator =
    if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
      HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
    } else {
      HostValidator.Builder(applicationContext)
        .addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample)
        .build()
    }

  override fun onCreateSession(): Session = KattioSession()
}

class KattioSession : Session() {
  override fun onCreateScreen(intent: Intent): Screen = KattioScreen(carContext)
}

class KattioScreen(car: CarContext) : Screen(car) {
  private val surface = FaceSurface()
  private var talking = false
  private val voice = CarVoice(car, surface, CarVoice.CarHost(car)) { on ->
    talking = on
    invalidate()
  }

  init {
    car.getCarService(AppManager::class.java).setSurfaceCallback(surface)
    lifecycle.addObserver(object : DefaultLifecycleObserver {
      override fun onCreate(owner: LifecycleOwner) = voice.open(talk = true)

      override fun onDestroy(owner: LifecycleOwner) {
        voice.close()
        surface.destroy()
      }
    })
  }

  override fun onGetTemplate(): Template {
    val icon = IconCompat.createWithResource(carContext, if (talking) R.drawable.ic_stop else R.drawable.ic_mic)
    val talk = Action.Builder()
      .setTitle(carContext.getString(if (talking) R.string.car_stop else R.string.car_talk))
      .setIcon(CarIcon.Builder(icon).build())
      .setOnClickListener { voice.toggle() }
      .build()
    return NavigationTemplate.Builder()
      .setActionStrip(ActionStrip.Builder().addAction(talk).build())
      .setBackgroundColor(CarColor.createCustom(0xff101216.toInt(), 0xff101216.toInt()))
      .build()
  }
}
