#!/usr/bin/env python3
"""
Generate 4 TikTok demo clips for ClipDD landing page.

Pipeline:
  1. Flux Schnell (fal.ai) → generate portrait image of Thai person with product
  2. FFmpeg → Ken Burns zoom + TikTok-style text overlay → 720x1280 / 5s / H.264

Run INSIDE web container:
  docker exec clipdd-web-1 python3 /app/generate_demos.py

Output: /app/media/demos/{urgent,review,drama,unbox}.mp4
"""
import os, sys, subprocess, tempfile, requests

# ── Config ────────────────────────────────────────────────────────────────────
FAL_KEY = os.environ.get("FAL_KEY", "")
OUT_DIR = "/app/media/demos"
W, H, FPS, DUR = 720, 1280, 25, 5
FONT    = ""   # resolved below

# ── Font resolution ───────────────────────────────────────────────────────────
for candidate in [
    "/usr/share/fonts/truetype/tlwg/Loma.ttf",
    "/usr/share/fonts/truetype/tlwg/Garuda.ttf",
    "/usr/share/fonts/truetype/tlwg/TlwgTypo.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]:
    if os.path.exists(candidate):
        FONT = candidate
        break

if not FONT:
    print("ERROR: no Thai font found"); sys.exit(1)
print(f"Font: {FONT}")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Clip definitions ──────────────────────────────────────────────────────────
# text_lines: list of (text, y_center, font_size, hex_color, has_box)
CLIPS = [
    {
        "name": "urgent",
        "flux_prompt": (
            "Young Thai woman 24 years old, beautiful, very excited expression, "
            "holding a white sunscreen SPF50 bottle and pointing it directly at camera enthusiastically. "
            "Wearing modern pastel casual outfit. "
            "Professional commercial studio photography, dramatic warm orange-red gradient background, "
            "sharp cinematic lighting, vibrant saturated colors. "
            "Full-body portrait framing showing face and hands with product clearly visible. "
            "TikTok seller style. Ultra-realistic, photorealistic, 8K, no text, no watermarks."
        ),
        "zoom": "in",
        "accent": "#ff6b35",
        "text_lines": [
            # (text,                         y,    size, color,     box)
            ("หยุดก่อน!!",                   110,  88,  "#ff6b35",  True),
            ("อย่าเลื่อนผ่าน",               215,  46,  "#ffddcc",  False),
            ("ครีมกันแดด SPF50",             460,  70,  "#ffffff",  True),
            ("โปรเหลือแค่คืนนี้",            570,  48,  "#ffd700",  False),
            ("เหลือ 02:47 นาที",             660,  50,  "#ff4444",  True),
            ("กดตะกร้าด่วนเลย",              880,  60,  "#ff6b35",  True),
            ("#กันแดด #TikTokขายของ",       1040,  34,  "#ffffff99", False),
        ],
    },
    {
        "name": "review",
        "flux_prompt": (
            "Beautiful Thai woman 27 years old, glowing healthy skin, genuine warm smile, "
            "holding a skincare serum bottle toward camera with both hands. "
            "She looks radiant and satisfied after using the product. "
            "Soft natural daylight, clean white-to-cream background, "
            "beauty influencer aesthetic, soft bokeh, warm pastel tones. "
            "Professional beauty photography, TikTok vertical portrait. "
            "Ultra-realistic, photorealistic, 8K, no text, no watermarks."
        ),
        "zoom": "slow_in",
        "accent": "#22c55e",
        "text_lines": [
            ("5 ดาว รีวิวจริง",               100,  72,  "#ffd700",  True),
            ("ใช้มาแล้ว 3 เดือน",             205,  46,  "#bbffcc",  False),
            ("ครีมบำรุงผิว",                  460,  74,  "#ffffff",  True),
            ("ก่อนใช้ หน้าหมองมาก",           575,  46,  "#ccffdd",  False),
            ("หลังใช้ ผิวสว่างขึ้นชัด",        665,  46,  "#ccffdd",  False),
            ("ลิงกอยู่ใน bio นะคะ",            880,  56,  "#22c55e",  True),
            ("#รีวิวสินค้า #ของดีบอกต่อ",    1040,  34,  "#ffffff99", False),
        ],
    },
    {
        "name": "drama",
        "flux_prompt": (
            "Thai young woman 25 years old, dramatic shocked-amazed expression, wide eyes, "
            "mouth slightly open in disbelief, holding a face serum bottle dramatically with both hands "
            "raised toward camera. "
            "Cinematic moody purple-magenta split lighting, dark atmospheric background with soft bokeh, "
            "high contrast shadows, emotional intense mood. "
            "TikTok drama storytelling aesthetic. "
            "Ultra-realistic, photorealistic, 8K, no text, no watermarks."
        ),
        "zoom": "out",
        "accent": "#9333ea",
        "text_lines": [
            ("ทำไมไม่มีใครบอก",              100,  76,  "#ff2d55",  True),
            ("ความลับที่ซ่อนไว้",             210,  50,  "#e9d5ff",  False),
            ("เซรั่มลดรอยสิว",               460,  74,  "#ffffff",  True),
            ("เสียเงินหมื่นกับสปาแพง",        570,  46,  "#e9d5ff",  False),
            ("ทั้งที่ตัวนี้ดีกว่า 10 เท่า",   660,  46,  "#e9d5ff",  False),
            ("แชร์ก่อนโดนลบ",                880,  58,  "#9333ea",  True),
            ("#เปิดโปง #ความจริง",           1040,  34,  "#ffffff99", False),
        ],
    },
    {
        "name": "unbox",
        "flux_prompt": (
            "Thai woman 26 years old, joyful excited smile, carefully opening a pastel-colored "
            "beauty gift box on a clean white table. "
            "Her hands and face both visible, showing genuine delight discovering skincare products inside. "
            "Soft teal-cyan aesthetic lighting, minimalist table setup with white tissue paper, "
            "lifestyle unboxing photography. "
            "TikTok unboxing content style, vertical portrait. "
            "Ultra-realistic, photorealistic, 8K, no text, no watermarks."
        ),
        "zoom": "pan_up",
        "accent": "#06b6d4",
        "text_lines": [
            ("แกะกล่องด้วยกัน",              100,  78,  "#06b6d4",  True),
            ("สั่งมาแล้ว 3 วัน",              210,  46,  "#a5f3fc",  False),
            ("ชุดบำรุงผิวหน้า",              460,  74,  "#ffffff",  True),
            ("packaging สวยมาก",             570,  48,  "#a5f3fc",  False),
            ("คุณภาพดีกว่าที่คิด",            660,  46,  "#a5f3fc",  False),
            ("ลองดูสิ คุ้มมาก",              880,  58,  "#06b6d4",  True),
            ("#unboxing #haul #พัสดุมา",    1040,  34,  "#ffffff99", False),
        ],
    },
]


# ── Flux Schnell image generation ─────────────────────────────────────────────
def generate_image(prompt: str, name: str) -> str:
    """Generate portrait image via fal.ai Flux Schnell. Returns local path."""
    if not FAL_KEY:
        raise RuntimeError("FAL_KEY not set")

    import fal_client
    os.environ["FAL_KEY"] = FAL_KEY

    print(f"  [flux] generating image for '{name}'...")
    result = fal_client.run(
        "fal-ai/flux/schnell",
        arguments={
            "prompt": prompt,
            "num_images": 1,
            "image_size": {"width": W, "height": H},
            "num_inference_steps": 8,   # slightly more steps for people
            "enable_safety_checker": False,
        },
    )
    url = result["images"][0]["url"]
    print(f"  [flux] image url: {url[:60]}...")

    # Download
    img_path = f"/tmp/demo_{name}.jpg"
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    with open(img_path, "wb") as f:
        f.write(r.content)
    print(f"  [flux] downloaded → {img_path} ({len(r.content)//1024}KB)")
    return img_path


# ── FFmpeg filter builder ──────────────────────────────────────────────────────
def hex_to_ffmpeg(color: str) -> str:
    """Convert #rrggbb[aa] → 0xrrggbbaa for FFmpeg."""
    c = color.lstrip("#")
    if len(c) == 6:
        return f"0x{c}FF"
    if len(c) == 8:
        return f"0x{c}"
    # handle short opacity like #ffffff99
    if len(c) == 8:
        return f"0x{c}"
    return f"0x{c}FF"


def build_vf(clip: dict) -> str:
    zoom_mode = clip["zoom"]
    lines     = clip["text_lines"]
    accent    = clip["accent"]
    frames    = DUR * FPS  # 125

    filters = []

    # ── 1. Scale / crop to exact 720×1280 ─────────────────────────────────────
    filters.append(
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H}"
    )

    # ── 2. Ken Burns motion ───────────────────────────────────────────────────
    if zoom_mode == "in":
        # Slow zoom in 1.0 → 1.12
        zp = (
            f"zoompan=z='min(zoom+0.00096,1.12)':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={W}x{H}:fps={FPS}"
        )
    elif zoom_mode == "slow_in":
        # Very slow zoom in 1.0 → 1.07
        zp = (
            f"zoompan=z='min(zoom+0.00056,1.07)':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={W}x{H}:fps={FPS}"
        )
    elif zoom_mode == "out":
        # Zoom out 1.12 → 1.0
        zp = (
            f"zoompan=z='if(lte(zoom,1.0),1.12,max(1.0,zoom-0.00096))':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s={W}x{H}:fps={FPS}"
        )
    else:  # pan_up
        # Pan up + slight zoom in
        zp = (
            f"zoompan=z='min(zoom+0.00056,1.07)':"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)-on*0.3':"
            f"d={frames}:s={W}x{H}:fps={FPS}"
        )
    filters.append(zp)

    # ── 3. Dark vignette overlay ──────────────────────────────────────────────
    # Top gradient band (dark → transparent)
    filters.append(f"drawbox=x=0:y=0:w={W}:h=220:color=black@0.55:t=fill")
    # Bottom gradient band
    filters.append(f"drawbox=x=0:y=960:w={W}:h=320:color=black@0.65:t=fill")

    # ── 4. Accent color stripe at very top ────────────────────────────────────
    acc_ffmpeg = hex_to_ffmpeg(accent)
    filters.append(f"drawbox=x=0:y=0:w={W}:h=5:color={acc_ffmpeg}:t=fill")

    # ── 5. Text lines ─────────────────────────────────────────────────────────
    for text, y, size, color, has_box in lines:
        # Sanitize: remove chars FFmpeg drawtext can't handle
        safe_text = (
            text
            .replace("\\", "")
            .replace("'",  "\u2019")   # curly apostrophe
            .replace(":",  "\\:")
            .replace(",",  "\\,")
            .replace("[",  "")
            .replace("]",  "")
            .replace("%",  "")
        )

        fc = hex_to_ffmpeg(color)

        if has_box:
            # Semi-transparent box behind important text
            filters.append(
                f"drawtext=fontfile={FONT}:text='{safe_text}':"
                f"fontsize={size}:fontcolor={fc}:"
                f"x=(w-text_w)/2:y={y}:"
                f"box=1:boxcolor=0x00000088:boxborderw=18:"
                f"shadowx=2:shadowy=2:shadowcolor=0x00000099"
            )
        else:
            filters.append(
                f"drawtext=fontfile={FONT}:text='{safe_text}':"
                f"fontsize={size}:fontcolor={fc}:"
                f"x=(w-text_w)/2:y={y}:"
                f"shadowx=2:shadowy=2:shadowcolor=0x000000CC"
            )

    return ",".join(filters)


# ── Main render ────────────────────────────────────────────────────────────────
def render(img_path: str, clip: dict) -> bool:
    out_path = f"{OUT_DIR}/{clip['name']}.mp4"
    vf       = build_vf(clip)

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",          # loop still image
        "-i",    img_path,
        "-t",    str(DUR),
        "-vf",   vf,
        "-c:v",  "libx264",
        "-crf",  "23",
        "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-r",    str(FPS),
        "-movflags", "+faststart",
        out_path,
    ]

    print(f"  [ffmpeg] rendering {clip['name']}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [ffmpeg] ERROR:\n{result.stderr[-800:]}")
        return False
    size = os.path.getsize(out_path) // 1024
    print(f"  [ffmpeg] done → {out_path} ({size}KB)")
    return True


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Allow --skip-flux flag to reuse existing /tmp/demo_*.jpg images
    skip_flux = "--skip-flux" in sys.argv

    ok = 0
    for clip in CLIPS:
        name = clip["name"]
        print(f"\n{'='*50}\n  {name.upper()}\n{'='*50}")

        img_path = f"/tmp/demo_{name}.jpg"

        if skip_flux and os.path.exists(img_path):
            print(f"  [flux] reusing cached {img_path}")
        else:
            try:
                img_path = generate_image(clip["flux_prompt"], name)
            except Exception as e:
                print(f"  [flux] FAILED: {e}")
                # Fallback: solid color background
                fallback = f"/tmp/demo_{name}_fallback.png"
                bg = {"urgent": "#1a0800", "review": "#001a08",
                      "drama": "#0d0020", "unbox": "#001a20"}[name]
                subprocess.run([
                    "ffmpeg", "-y", "-f", "lavfi",
                    "-i", f"color=c={bg}:size={W}x{H}:rate=1",
                    "-vframes", "1", fallback
                ], capture_output=True)
                img_path = fallback

        if render(img_path, clip):
            ok += 1

    print(f"\n{'='*50}")
    print(f"  Result: {ok}/{len(CLIPS)} clips generated")
    print(f"  Output: {OUT_DIR}/")
    print(f"{'='*50}")
