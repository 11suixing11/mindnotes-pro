param(
  [Parameter(Mandatory=$true)][string]$StatePath,
  [int]$Left=0,
  [int]$Top=0,
  [int]$Width=0,
  [int]$Height=0
)
$ErrorActionPreference = 'Stop'
# Keep creation, placement and painting on the same per-monitor-aware native
# thread. Windows PowerShell's WinForms runtime is system-DPI-aware and can
# virtualize placement on a monitor with a different scale factor.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
public static class MindNotesCaptureFixture {
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int x, y; }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left, top, right, bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct Message {
    public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam;
    public uint time; public Point point; public uint privateValue;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Paint {
    public IntPtr dc; public int erase; public Rect rect; public int restore, update;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst=32)] public byte[] reserved;
  }
  [UnmanagedFunctionPointer(CallingConvention.Winapi)] public delegate IntPtr WindowProcedure(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct WindowClass {
    public uint size, style; public WindowProcedure procedure; public int classExtra, windowExtra;
    public IntPtr instance, icon, cursor, background; public string menu, name; public IntPtr smallIcon;
  }
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern ushort RegisterClassEx(ref WindowClass value);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] static extern IntPtr GetModuleHandle(string name);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr CreateWindowEx(uint extended, string name, string title, uint style, int x, int y, int width, int height, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr parameter);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);
  [DllImport("user32.dll")] static extern bool UpdateWindow(IntPtr window);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool SetWindowText(IntPtr window, string text);
  [DllImport("user32.dll")] static extern UIntPtr SetTimer(IntPtr window, UIntPtr id, uint interval, IntPtr procedure);
  [DllImport("user32.dll")] static extern bool KillTimer(IntPtr window, UIntPtr id);
  [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr window);
  [DllImport("user32.dll")] static extern void PostQuitMessage(int code);
  [DllImport("user32.dll")] static extern int GetMessage(out Message message, IntPtr window, uint min, uint max);
  [DllImport("user32.dll")] static extern bool TranslateMessage(ref Message message);
  [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref Message message);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr DefWindowProc(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] static extern IntPtr BeginPaint(IntPtr window, out Paint paint);
  [DllImport("user32.dll")] static extern bool EndPaint(IntPtr window, ref Paint paint);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window, out Rect rect);
  [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
  [DllImport("user32.dll")] static extern bool InvalidateRect(IntPtr window, IntPtr rect, bool erase);
  [DllImport("user32.dll")] static extern int FillRect(IntPtr dc, ref Rect rect, IntPtr brush);
  [DllImport("gdi32.dll")] static extern IntPtr CreateSolidBrush(uint color);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr value);
  static WindowProcedure procedure = Handle;
  static string statePath;
  static bool green;
  static IntPtr Handle(IntPtr window, uint message, UIntPtr wParam, IntPtr lParam) {
    if (message == 0x000f) {
      Paint paint; IntPtr dc = BeginPaint(window, out paint);
      Rect rect; GetClientRect(window, out rect);
      IntPtr brush = CreateSolidBrush(green ? (uint)(46 | (151 << 8) | (81 << 16)) : (uint)(25 | (87 << 8) | (147 << 16)));
      FillRect(dc, ref rect, brush); DeleteObject(brush); EndPaint(window, ref paint);
      return IntPtr.Zero;
    }
    if (message == 0x0113) {
      if (File.Exists(statePath)) {
        string state = File.ReadAllText(statePath).Trim();
        if (state == "exit") { DestroyWindow(window); return IntPtr.Zero; }
        if (state == "B" && !green) {
          green = true; SetWindowText(window, "MindNotes capture fixture B");
          InvalidateRect(window, IntPtr.Zero, true); UpdateWindow(window);
          File.WriteAllText(statePath + ".ready", "B");
        }
      }
      return IntPtr.Zero;
    }
    if (message == 0x0002) { KillTimer(window, new UIntPtr(1)); PostQuitMessage(0); return IntPtr.Zero; }
    return DefWindowProc(window, message, wParam, lParam);
  }
  public static void Run(string file, int left, int top, int width, int height) {
    statePath = file; green = false;
    IntPtr previous = SetThreadDpiAwarenessContext(new IntPtr(-4));
    if (previous == IntPtr.Zero) throw new InvalidOperationException("Per-monitor DPI context unavailable");
    try {
      if (width <= 0 || height <= 0) { left = 0; top = 0; width = GetSystemMetrics(0); height = GetSystemMetrics(1); }
      var value = new WindowClass { size=(uint)Marshal.SizeOf(typeof(WindowClass)), procedure=procedure,
        instance=GetModuleHandle(null), name="MindNotesCaptureFixture" };
      if (RegisterClassEx(ref value) == 0) throw new InvalidOperationException("Fixture class registration failed");
      IntPtr window = CreateWindowEx(0x00000088, value.name, "MindNotes capture fixture A", 0x80000000,
        left, top, width, height, IntPtr.Zero, IntPtr.Zero, value.instance, IntPtr.Zero);
      if (window == IntPtr.Zero) throw new InvalidOperationException("Fixture window creation failed");
      ShowWindow(window, 4);
      SetWindowPos(window, new IntPtr(-1), left, top, width, height, 0x0010);
      UpdateWindow(window); SetTimer(window, new UIntPtr(1), 50, IntPtr.Zero);
      Rect actual; GetWindowRect(window, out actual);
      string bounds = String.Format("{{\"left\":{0},\"top\":{1},\"width\":{2},\"height\":{3}}}",
        actual.left, actual.top, actual.right - actual.left, actual.bottom - actual.top);
      File.WriteAllText(file + ".bounds", bounds, new UTF8Encoding(false));
      File.WriteAllText(file + ".native", String.Format("{{\"left\":{0},\"top\":{1},\"right\":{2},\"bottom\":{3},\"dpi\":{4},\"visible\":{5}}}",
        actual.left, actual.top, actual.right, actual.bottom, GetDpiForWindow(window), IsWindowVisible(window) ? "true" : "false"), new UTF8Encoding(false));
      File.WriteAllText(file + ".ready", "A");
      Message message;
      while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0) { TranslateMessage(ref message); DispatchMessage(ref message); }
    } finally { SetThreadDpiAwarenessContext(previous); }
  }
}
'@
[MindNotesCaptureFixture]::Run($StatePath, $Left, $Top, $Width, $Height)
