#!/usr/bin/env python3
import re
path = "c:/Users/Faith Claire Anne/Documents/ZheysProject/walkie-chattie/src/renderer/src/components/chat/ChatInput.tsx"
with open(path) as f: c = f.read()
old = rfunction raw() { [native code] },new = function raw() { [native code] },if old in c: print("found"); c=c.replace(old,new)
with open(path,"w") as f: f.write(c)
else: print("not found")