#NoEnv
#Persistent
#NoTrayIcon
#SingleInstance, Force
SetWorkingDir %A_ScriptDir%
DetectHiddenWindows, On
SetTitleMatchMode, 2
SendLevel, 1

; HWNDs
global VIDEOPLAYERHWND
global DRAWERHWND
global BARHWND

; States
global VIDEOSTATE
global VIDEORECT := {"x": 0, "y": 0, "width": 1028, "height": 720}

SetTimer, WatchIncoming, 1

lastMessage := ""

global stdin  := FileOpen("*", "r `n")

HandleIncomingMessage(query)
{
  if (query = "desktop") {
    DllCall("SetParent", UInt, WinExist("desktopmodule"), UInt, WinExist("Program Manager"))
  } else if (query = "drawer") {
    SetTimer, WatchForDrawer, 100
  } else if (query = "drawerOpen") {
    WinShow, ahk_id %DRAWERHWND%
  } else if (query = "drawerClose") {
    WinHide, ahk_id %DRAWERHWND%
  } else if (query = "appbar") {
    SetTimer, WatchForAppbar, 100
  } else if (query = "videoplayer") {
    SetTimer, WatchForIE, 100
  } else if (query = "browserResize") {
    WinGetPos, wx, wy, , , ahk_id %VIDEOPLAYERHWND%
    WinMove, ahk_id %VIDEOPLAYERHWND%, , %wx%, %wy%, 1050, 600
    WinSet, Region, 0-75 w1050 h600, ahk_id %VIDEOPLAYERHWND%
  } else if (query = "toggleVideoPlayer") {
    if (VIDEOSTATE)
      WinHide, ahk_id %VIDEOPLAYERHWND%
    else {
      WinShow, ahk_id %VIDEOPLAYERHWND% 
      WinActivate, ahk_id %VIDEOPLAYERHWND% 
    }
    VIDEOSTATE := !VIDEOSTATE
  } else if (query = "videofullscreen") {
    WinGetPos, x, y, w, h, ahk_id %VIDEOPLAYERHWND%
    VIDEORECT.x := x 
    VIDEORECT.y := y 
    VIDEORECT.width := w
    VIDEORECT.height := h
    monitorNumber := GetMonitorIndexFromWindow(VIDEOPLAYERHWND)
    SysGet, currMonitor, Monitor, %monitorNumber%
    fsX := currMonitorLeft - 5
    fsY := currMonitorTop - 77
    fsW := currMonitorRight - currMonitorLeft + 10
    fsH := currMonitorBottom - currMonitorTop + 79
    WinMove, ahk_id %VIDEOPLAYERHWND%,, %fsX%, %fsY%, %fsW%, %fsH%
    WinSet, Region, 0-75 w%fsW% h%fsH%, ahk_id %VIDEOPLAYERHWND%
  } else if (query = "videorestore") {
    x := VIDEORECT.x
    y := VIDEORECT.y
    w := VIDEORECT.width
    h := VIDEORECT.height
    WinMove, ahk_id %VIDEOPLAYERHWND%, , %x%, %y%, %w%, %h%
    hr := h - 75
    WinSet, Region, 0-75 w%w% h%hr%, ahk_id %VIDEOPLAYERHWND%
  } else if (SubStr(query, 1, 2) = "a-") {
    CoordMode, Mouse, Screen
    pid := Substr(query, 3)
    WinActivate, ahk_id %pid%
    WinGetPos, wx, wy, ww, wh, ahk_id %pid%
    if (SubStr(query, -3, 4) = "-alt") {
      StringTrimRight, pid, pid, 4
      MouseGetPos, mx, my
      x := mx - (ww / 2)
      y := my - (wh / 2)
      WinMove, ahk_id %pid%, , %x%, %y%
    } else {
      x := wx + (ww / 2)
      y := wy + (wh / 2)
      MouseMove, %x%, %y%
      ;~ SetTrans(1, pid)
      ;~ SetTrans(0, 0)
    }
  } else {
    if (SubStr(query, 1, 8) = "setcolor") {
      color := SubStr(query, 10)
      SetAcrylicGlassEffect(color, 50, DRAWERHWND)
      SetAcrylicGlassEffect(color, 50, BARHWND)
    }
  }
}

SendKeys(keys)
{
  Loop, % keys.maxIndex()
  {
      k := keys[A_Index]
      SendInput, { %k% down }
  }
  Loop, % keys.maxIndex()
  {
      k := keys[A_Index]
      SendInput, { %k% up }
  }
}

WatchForDrawer:
  if (!WinExist("drawermodule"))
    return
  
  DRAWERHWND := WinExist("drawermodule")
  WinSet, AlwaysOnTop, On, ahk_id %DRAWERHWND%
  SetAcrylicGlassEffect("74549e", 50, DRAWERHWND)
  WinHide, ahk_id %DRAWERHWND%
  DRAWERSTATE := "closed"
  SetTimer, WatchForDrawer, Off
return

WatchForAppbar:
  if (!WinExist("appbarmodule")) 
    return

  BARHWND := WinExist("appbarmodule")
  SetAcrylicGlassEffect("74549e", 50, BARHWND)
  SetTimer, WatchForAppbar, Off
  GoSub, RegisterAppbar
return

WatchForIE:
  if (!WinExist("data:"))
    return
    
  WinGet, VIDEOPLAYERHWND, ID, data:
  WinMove, ahk_id %VIDEOPLAYERHWND%, , 0, 0, 1028, 720
  WinSet, Region, 0-75 w1028 h720, ahk_id %VIDEOPLAYERHWND%
  SetMouseDelay, 0
  MouseGetPos, mx, my
  CoordMode, Mouse, Relative
  Click, 995, 100
  CoordMode, Mouse, Window
  MouseMove, %mx%, %my%
  VIDEOSTATE := true
  SetTimer, WatchForIE, Off
return

RegisterAppbar:
WinGetPos, , , BWW, BH, ahk_id %BARHWND%

ABM := DllCall( "RegisterWindowMessage", Str,"AppBarMsg" )
; OnMessage( ABM, "ABM_Callback" )
; OnMessage( (WM_MOUSEMOVE := 0x200) , "CheckMousePos" )

; APPBARDATA : http://msdn2.microsoft.com/en-us/library/ms538008.aspx
VarSetCapacity( APPBARDATA , (cbAPPBARDATA := A_PtrSize == 8 ? 48 : 36), 0 )
Off :=  NumPut( cbAPPBARDATA, APPBARDATA, "Ptr" )
Off :=  NumPut( hAB, Off+0, "Ptr" )
Off :=  NumPut( ABM, Off+0, "UInt" )
Off :=  NumPut( 1, Off+0, "UInt" ) 
Off :=  NumPut( 0, Off+0, "Int" ) 
Off :=  NumPut( 0, Off+0, "Int" ) 
Off :=  NumPut( BW, Off+0, "Int" ) 
Off :=  NumPut( BH, Off+0, "Int" )
Off :=  NumPut( 1, Off+0, "Ptr" )
;Off :=  NumPut(   2, Off+0, "Ptr" )  Put on bottom

DllCall("Shell32.dll\SHAppBarMessage", UInt,(ABM_NEW:=0x0)     , UInt,&APPBARDATA )
DllCall("Shell32.dll\SHAppBarMessage", UInt,(ABM_QUERYPOS:=0x2), UInt,&APPBARDATA )
DllCall("Shell32.dll\SHAppBarMessage", UInt,(ABM_SETPOS:=0x3)  , UInt,&APPBARDATA )
return

GetMonitorIndexFromWindow(windowHandle)
{
	; Starts with 1.
	monitorIndex := 1

	VarSetCapacity(monitorInfo, 40)
	NumPut(40, monitorInfo)
	
	if (monitorHandle := DllCall("MonitorFromWindow", "uint", windowHandle, "uint", 0x2)) 
		&& DllCall("GetMonitorInfo", "uint", monitorHandle, "uint", &monitorInfo) 
	{
		monitorLeft   := NumGet(monitorInfo,  4, "Int")
		monitorTop    := NumGet(monitorInfo,  8, "Int")
		monitorRight  := NumGet(monitorInfo, 12, "Int")
		monitorBottom := NumGet(monitorInfo, 16, "Int")
		workLeft      := NumGet(monitorInfo, 20, "Int")
		workTop       := NumGet(monitorInfo, 24, "Int")
		workRight     := NumGet(monitorInfo, 28, "Int")
		workBottom    := NumGet(monitorInfo, 32, "Int")
		isPrimary     := NumGet(monitorInfo, 36, "Int") & 1

		SysGet, monitorCount, MonitorCount

		Loop, %monitorCount%
		{
			SysGet, tempMon, Monitor, %A_Index%

			; Compare location to determine the monitor index.
			if ((monitorLeft = tempMonLeft) and (monitorTop = tempMonTop)
				and (monitorRight = tempMonRight) and (monitorBottom = tempMonBottom))
			{
				monitorIndex := A_Index
				break
			}
		}
	}
	
	return monitorIndex
}

ConvertToBGRfromRGB(RGB) { ; Get numeric BGR value from numeric RGB value or HTML color name
  ; HEX values
  BGR := SubStr(RGB, -1, 2) SubStr(RGB, 1, 4) 
  Return BGR 
}

SetAcrylicGlassEffect(thisColor, thisAlpha, hWindow) {
  ; based on https://github.com/jNizM/AHK_TaskBar_SetAttr/blob/master/scr/TaskBar_SetAttr.ahk
  ; by jNizM
    initialAlpha := thisAlpha
    If (thisAlpha<16)
       thisAlpha := 16
    Else If (thisAlpha>245)
       thisAlpha := 245


    thisColor := ConvertToBGRfromRGB(thisColor)
    thisAlpha := Format("{1:#x}", thisAlpha)
    gradient_color := thisAlpha . thisColor

    Static init, accent_state := 4, ver := DllCall("GetVersion") & 0xff < 10
    Static pad := A_PtrSize = 8 ? 4 : 0, WCA_ACCENT_POLICY := 19
    accent_size := VarSetCapacity(ACCENT_POLICY, 16, 0)
    NumPut(accent_state, ACCENT_POLICY, 0, "int")

    If (RegExMatch(gradient_color, "0x[[:xdigit:]]{8}"))
       NumPut(gradient_color, ACCENT_POLICY, 8, "int")

    VarSetCapacity(WINCOMPATTRDATA, 4 + pad + A_PtrSize + 4 + pad, 0)
    && NumPut(WCA_ACCENT_POLICY, WINCOMPATTRDATA, 0, "int")
    && NumPut(&ACCENT_POLICY, WINCOMPATTRDATA, 4 + pad, "ptr")
    && NumPut(accent_size, WINCOMPATTRDATA, 4 + pad + A_PtrSize, "uint")
    If !(DllCall("user32\SetWindowCompositionAttribute", "ptr", hWindow, "ptr", &WINCOMPATTRDATA))
       Return 0 
    thisOpacity := (initialAlpha<16) ? 60 + initialAlpha*9 : 250
    WinSet, Transparent, %thisOpacity%, ahk_id %hWindow%
    Return 1
	msgbox done
}

SetTrans(toggle, wId)
{
  tVal := toggle ? 105 : 255
  WinGet windows, List
  Loop %windows%
  {
	id := windows%A_Index%
	WinGetTitle wt, ahk_id %id%
    if (id = wId || wt = "" || wt = "Program Manager" || wt = "NVIDIA GeForce Overlay" || "ColorGui")
		continue
	WinSet, Transparent, %tVal%, %wt%
  }
  WinSet, Transparent, off, ahk_class Progman
}  
  

WatchIncoming:
  stdout.Read(0) ; Flush the write buffer.
  query := RTrim(stdin.ReadLine(), "`n")  ;'query' stores the string received from node ('some example' in this case)
  HandleIncomingMessage(query)
  stdout.Read(0) ; Flush the write buffer.
return
