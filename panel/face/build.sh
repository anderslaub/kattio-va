#!/bin/sh
# Build Kattio's face engine (components/kattio_face) as WebAssembly for the panel:
#   custom_components/kattio/www/kattio-face.wasm
# Needs clang and wasm-ld (LLVM) and a WASI sysroot + compiler-rt from wasi-sdk
# (https://github.com/WebAssembly/wasi-sdk/releases: wasi-sysroot-*.tar.gz and libclang_rt-*.tar.gz), e.g.
#   WASI_SYSROOT=~/wasi/wasi-sysroot-34.0 WASI_RT=~/wasi/libclang_rt-34.0 panel/face/build.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
: "${WASI_SYSROOT:?set WASI_SYSROOT to an unpacked wasi-sysroot}"
: "${WASI_RT:?set WASI_RT to an unpacked libclang_rt (wasi-sdk)}"
: "${CXX:=clang++}"
out="$root/custom_components/kattio/www/kattio-face.wasm"
"$CXX" --target=wasm32-wasip1 --sysroot="$WASI_SYSROOT" -O3 -std=c++17 -fno-exceptions -fno-rtti \
  -I"$root/components/kattio_face" \
  "$here/face_wasm.cpp" "$root/components/kattio_face/face_engine.cpp" \
  -mexec-model=reactor -nodefaultlibs -lc++ -lc++abi -lc "$WASI_RT/wasm32-unknown-wasip1/libclang_rt.builtins.a" \
  -Wl,--strip-all -Wl,--gc-sections \
  -o "$out"
echo "$out: $(wc -c < "$out") bytes"
