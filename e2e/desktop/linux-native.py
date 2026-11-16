#!/usr/bin/env python3
"""X11 fixture + XTest input, exclusively on a live task-owned virtual server.

No XRaiseWindow or XSetInputFocus: every focus/stacking result belongs to the WM/product.
"""
import ctypes as c
import json
import os
from pathlib import Path
import select
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
MARKER = ROOT / 'tmp/linux-desktop-20261114/test-display/state/owner.json'

def identity(pid):
    fields = Path(f'/proc/{pid}/stat').read_text().split(') ')[-1].split()
    return {'start_ticks': fields[19], 'exe': str(Path(f'/proc/{pid}/exe').resolve()),
            'cmdline': Path(f'/proc/{pid}/cmdline').read_bytes().decode().split('\0')[:-1]}

def guard():
    display = os.environ.get('DISPLAY', '')
    if os.environ.get('WAYLAND_DISPLAY') or not display.startswith(':') or not display[1:].isdigit() or int(display[1:]) < 90:
        raise RuntimeError('Native fixture requires the task-owned virtual DISPLAY 90+, never the user desktop')
    record = json.loads(MARKER.read_text())
    if record['display'] != display or identity(record['pid']) != record['identity'] or Path(f"/proc/{record['pid']}").stat().st_uid != os.getuid():
        raise RuntimeError('Owned virtual server PID lifecycle identity changed')
    auth = MARKER.parent / 'Xauthority'
    if Path(os.environ.get('XAUTHORITY', '/nonexistent')).resolve() != auth.resolve() or str(auth) not in record['identity']['cmdline']:
        raise RuntimeError('Owned virtual Xauthority does not match')
    if not Path(record['identity']['exe']).is_relative_to(MARKER.parents[1] / 'extracted'):
        raise RuntimeError('X server executable is not task owned')

try:
    guard()
except Exception as error:
    print(str(error), file=sys.stderr)
    sys.exit(2)

X = c.CDLL('libX11.so.6')
T = c.CDLL('libXtst.so.6')
D = c.c_void_p
W = c.c_ulong
class WindowAttributes(c.Structure):
    _fields_=[('x',c.c_int),('y',c.c_int),('width',c.c_int),('height',c.c_int),('border_width',c.c_int),('depth',c.c_int),
              ('visual',D),('root',W),('window_class',c.c_int),('bit_gravity',c.c_int),('win_gravity',c.c_int),('backing_store',c.c_int),
              ('backing_planes',W),('backing_pixel',W),('save_under',c.c_int),('colormap',W),('map_installed',c.c_int),('map_state',c.c_int),
              ('all_event_masks',c.c_long),('your_event_mask',c.c_long),('do_not_propagate_mask',c.c_long),('override_redirect',c.c_int),('screen',D)]

def api(lib, name, result, args):
    func = getattr(lib, name); func.restype = result; func.argtypes = args; return func

open_display = api(X, 'XOpenDisplay', D, [c.c_char_p])
translate = api(X,'XTranslateCoordinates',c.c_int,[D,W,W,c.c_int,c.c_int,c.POINTER(c.c_int),c.POINTER(c.c_int),c.POINTER(W)])
attributes = api(X,'XGetWindowAttributes',c.c_int,[D,W,c.POINTER(WindowAttributes)])
selection_owner = api(X,'XGetSelectionOwner',W,[D,W])
root_window = api(X, 'XDefaultRootWindow', W, [D])
create = api(X, 'XCreateSimpleWindow', W, [D,W,c.c_int,c.c_int,c.c_uint,c.c_uint,c.c_uint,W,W])
store = api(X, 'XStoreName', c.c_int, [D,W,c.c_char_p])
atom = api(X, 'XInternAtom', W, [D,c.c_char_p,c.c_int])
change = api(X, 'XChangeProperty', c.c_int, [D,W,W,W,c.c_int,c.c_int,c.POINTER(c.c_ubyte),c.c_int])
map_window = api(X, 'XMapWindow', c.c_int, [D,W])
select_input = api(X, 'XSelectInput', c.c_int, [D,W,c.c_long])
flush = api(X, 'XSync', c.c_int, [D,c.c_int])
pending = api(X, 'XPending', c.c_int, [D])
next_event = api(X, 'XNextEvent', c.c_int, [D,D])
focus = api(X, 'XGetInputFocus', c.c_int, [D,c.POINTER(W),c.POINTER(c.c_int)])
get_property = api(X, 'XGetWindowProperty', c.c_int, [D,W,W,c.c_long,c.c_long,c.c_int,W,c.POINTER(W),c.POINTER(c.c_int),c.POINTER(W),c.POINTER(W),c.POINTER(c.POINTER(c.c_ubyte))])
query_tree = api(X, 'XQueryTree', c.c_int, [D,W,c.POINTER(W),c.POINTER(W),c.POINTER(c.POINTER(W)),c.POINTER(c.c_uint)])
free = api(X, 'XFree', c.c_int, [D])
move = api(T, 'XTestFakeMotionEvent', c.c_int, [D,c.c_int,c.c_int,c.c_int,W])
button = api(T, 'XTestFakeButtonEvent', c.c_int, [D,c.c_uint,c.c_int,W])
key = api(T, 'XTestFakeKeyEvent', c.c_int, [D,c.c_uint,c.c_int,W])
keysym = api(X, 'XStringToKeysym', W, [c.c_char_p])
keycode = api(X, 'XKeysymToKeycode', c.c_uint, [D,W])
set_background = api(X, 'XSetWindowBackground', c.c_int, [D,W,W])
clear = api(X, 'XClearWindow', c.c_int, [D,W])
destroy = api(X, 'XDestroyWindow', c.c_int, [D,W])
close = api(X, 'XCloseDisplay', c.c_int, [D])

display = open_display(os.environ['DISPLAY'].encode())
if not display: raise RuntimeError('Owned virtual X server could not be opened')
root = root_window(display)
window = create(display, root, 0, 0, 1280, 900, 0, 0, 0x195793)
store(display, window, b'MindNotes Linux owned native fixture')
pid = (W*1)(os.getpid())
change(display, window, atom(display,b'_NET_WM_PID',0), atom(display,b'CARDINAL',0), 32, 0, c.cast(pid,c.POINTER(c.c_ubyte)),1)
# Standard pre-map WM hint: fullscreen background fixture, managed by the current owned WM.
fullscreen = (W*1)(atom(display,b'_NET_WM_STATE_FULLSCREEN',0))
change(display,window,atom(display,b'_NET_WM_STATE',0),atom(display,b'ATOM',0),32,0,c.cast(fullscreen,c.POINTER(c.c_ubyte)),1)
select_input(display,window,(1<<2)|(1<<0)|(1<<15))
map_window(display, window); flush(display, 0)
clicks = 0; keys = 0

def drain():
    global clicks, keys
    while pending(display):
        event = (c.c_long*24)(); next_event(display,c.byref(event))
        if event[0] == 4: clicks += 1
        if event[0] == 2: keys += 1

def stacking():
    actual=W(); fmt=c.c_int(); count=W(); after=W(); data=c.POINTER(c.c_ubyte)()
    get_property(display,root,atom(display,b'_NET_CLIENT_LIST_STACKING',0),0,4096,0,0,c.byref(actual),c.byref(fmt),c.byref(count),c.byref(after),c.byref(data))
    try: return list(c.cast(data,c.POINTER(W))[:count.value]) if data and fmt.value == 32 else []
    finally:
        if data: free(data)

def tree(target):
    root_return=W(); parent=W(); children=c.POINTER(W)(); count=c.c_uint()
    if not query_tree(display,target,c.byref(root_return),c.byref(parent),c.byref(children),c.byref(count)):
        raise RuntimeError('Native fixture window disappeared')
    try: return {'parent':parent.value,'children':list(children[:count.value]) if children else []}
    finally:
        if children: free(children)

def window_state(target):
    state=WindowAttributes()
    if not attributes(display,target,c.byref(state)): raise RuntimeError('Native window state unavailable')
    x=c.c_int();y=c.c_int();child=W();translate(display,target,root,0,0,c.byref(x),c.byref(y),c.byref(child))
    return {'mapState':state.map_state,'overrideRedirect':bool(state.override_redirect),'x':x.value,'y':y.value,'width':state.width,'height':state.height}

def root_child(target):
    for _ in range(20):
        parent=tree(target)['parent']
        if parent == root: return target
        if not parent: return target
        target=parent
    raise RuntimeError('Native window hierarchy exceeds bound')

print(json.dumps({'ready':True,'window':window,'pid':os.getpid()}), flush=True)
try:
    while True:
        drain()
        if not select.select([sys.stdin],[],[],0.02)[0]: continue
        line = sys.stdin.readline()
        if not line: break
        request = json.loads(line)
        try:
            guard()
            action=request['action']
            if action == 'close': print(json.dumps({'closed':True}),flush=True); break
            if action == 'click':
                move(display,-1,int(request['x']),int(request['y']),0); button(display,1,1,0); button(display,1,0,0)
            elif action == 'drag':
                points=request['points']; move(display,-1,int(points[0]['x']),int(points[0]['y']),0); button(display,1,1,0)
                for point in points[1:]: move(display,-1,int(point['x']),int(point['y']),0); flush(display,0); time.sleep(0.020)
                button(display,1,0,0)
            elif action == 'key':
                code=keycode(display,keysym(request['key'].encode())); key(display,code,1,0); key(display,code,0,0)
            elif action == 'color': set_background(display,window,int(request['rgb'])); clear(display,window)
            elif action != 'state': raise RuntimeError('Unknown native fixture action')
            flush(display,0); time.sleep(0.04); drain()
            focused=W(); revert=c.c_int(); focus(display,c.byref(focused),c.byref(revert))
            targets=request.get('windows',[]) + [window,focused.value]
            hierarchy={str(target):{'parent':tree(target)['parent'],'rootChild':root_child(target),**window_state(target)} for target in targets if target > 1}
            print(json.dumps({'clicks':clicks,'keys':keys,'focus':focused.value,'stacking':stacking(),'rootStack':tree(root)['children'],'hierarchy':hierarchy,'window':window,'compositorOwner':selection_owner(display,atom(display,b'_NET_WM_CM_S0',0))}),flush=True)
        except Exception as error: print(json.dumps({'error':str(error)}),flush=True)
finally:
    destroy(display,window); close(display)
