#!/usr/bin/env python3
"""
Generate 4 demo TikTok-style clips for ClipDD landing page.
Run inside web container: python3 generate_demos.py
Output: /app/media/demos/{urgent,review,drama,unbox}.mp4
"""
import subprocess, os, tempfile, sys

FONT = "/usr/share/fonts/truetype/tlwg/Garuda.ttf"
OUT = "/app/media/demos"
W, H, FPS, DUR = 720, 1280, 25, 5

os.makedirs(OUT, exist_ok=True)

# Check font exists
if not os.path.exists(FONT):
    # Try alternatives
    for alt in ["/usr/share/fonts/truetype/tlwg/TlwgTypo.ttf",
                "/usr/share/fonts/truetype/tlwg/Loma.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(alt):
            FONT = alt
            break
    else:
        print("ERROR: No font found")
        sys.exit(1)

print(f"Using font: {FONT}")

CLIPS = [
    {
        "name": "urgent",
        "bg": "#0d0400",
        "grad": "#ff6b00",
        "lines": [
            # (text, y, size, color, bold)
            ("⚡ หยุดก่อน!! ⚡",       120, 72, "#ff6b35", True),
            ("อย่าเลื่อนผ่าน",          230, 48, "#ffccaa", False),
            ("ครีมกันแดด SPF50",        410, 62, "#ffffff", True),
            ("โปรเหลือแค่คืนนี้!!",     530, 46, "#ffd700", False),
            ("⏰  02:47  นาที",          680, 52, "#ff4444", True),
            ("👆 กดตะกร้าด่วนเลย!",    900, 56, "#ff6b35", True),
            ("#กันแดด #TikTokขายของ",  1100, 34, "#ffffff88", False),
        ],
    },
    {
        "name": "review",
        "bg": "#050a00",
        "grad": "#22c55e",
        "lines": [
            ("⭐⭐⭐⭐⭐ รีวิวจริง",      100, 58, "#ffd700", True),
            ("ใช้มาแล้ว 3 เดือน",        220, 44, "#bbffcc", False),
            ("ครีมบำรุงผิว",             400, 68, "#ffffff", True),
            ("ก่อนหน้านี้หน้าดำมาก",     520, 44, "#ccffdd", False),
            ("หลังใช้ผิวสว่างขึ้นชัด",  640, 44, "#ccffdd", False),
            ("🔗 ลิงก์อยู่ใน bio นะคะ",  860, 50, "#22c55e", True),
            ("#รีวิวสินค้า #ของดี",      1100, 34, "#ffffff88", False),
        ],
    },
    {
        "name": "drama",
        "bg": "#0a0010",
        "grad": "#9333ea",
        "lines": [
            ("😱 ทำไมไม่มีใครบอก?!",    100, 60, "#ff2d55", True),
            ("ความลับที่ซ่อนไว้",        220, 50, "#e9d5ff", False),
            ("เซรั่มลดรอยสิว",           400, 68, "#ffffff", True),
            ("ฉันเสียเงินไปหมื่นกว่า",   520, 44, "#e9d5ff", False),
            ("กับสปาแพงๆ ทั้งที่",       620, 44, "#e9d5ff", False),
            ("🔥 แชร์ก่อนโดนลบ!",       860, 52, "#9333ea", True),
            ("#เปิดโปง #ความจริง",       1100, 34, "#ffffff88", False),
        ],
    },
    {
        "name": "unbox",
        "bg": "#001015",
        "grad": "#06b6d4",
        "lines": [
            ("📦 แกะกล่องด้วยกัน!",      100, 62, "#06b6d4", True),
            ("สั่งมาแล้ว 3 วัน",          220, 46, "#a5f3fc", False),
            ("ชุดบำรุงผิวหน้า",          400, 68, "#ffffff", True),
            ("packaging สวยมาก!!",        520, 46, "#a5f3fc", False),
            ("คุณภาพดีกว่าที่คิด 😍",     640, 46, "#a5f3fc", False),
            ("💙 ลองดูสิ คุ้มมาก!",       860, 52, "#06b6d4", True),
            ("#unboxing #haul #พัสดุมา", 1100, 34, "#ffffff88", False),
        ],
    },
]


def build_vf(lines, bg, grad):
    """Build FFmpeg video filter chain."""
    # Base: gradient background using color mix + vignette
    filters = []

    # Ken Burns slow zoom on solid color bg
    filters.append(
        f"zoompan=z='min(zoom+0.001,1.15)':d={DUR*FPS}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"s={W}x{H}:fps={FPS}"
    )

    # Top color stripe (gradient illusion)
    filters.append(
        f"drawbox=x=0:y=0:w={W}:h=300:color={grad}@0.25:t=fill"
    )
    filters.append(
        f"drawbox=x=0:y=980:w={W}:h=300:color={grad}@0.15:t=fill"
    )

    # Sidebar (TikTok engagement icons area)
    filters.append(
        f"drawbox=x={W-90}:y=600:w=90:h=400:color=black@0.3:t=fill"
    )

    # Text lines
    for text, y, size, color, bold in lines:
        # Sanitize text for FFmpeg: escape special chars
        safe = (text
                .replace("\\", "\\\\")
                .replace("'", "\u2019")
                .replace(":", "\\:")
                .replace(",", "\\,")
                .replace("[", "\\[")
                .replace("]", "\\]"))
        filters.append(
            f"drawtext=fontfile={FONT}:text='{safe}':"
            f"fontsize={size}:fontcolor={color}:"
            f"x=(w-text_w)/2:y={y}:"
            f"shadowx=3:shadowy=3:shadowcolor=black@0.8"
        )

    return ",".join(filters)


def generate(clip):
    name = clip["name"]
    out_path = f"{OUT}/{name}.mp4"

    vf = build_vf(clip["lines"], clip["bg"], clip["grad"])

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"color=c={clip['bg']}:size={W}x{H}:rate={FPS}",
        "-t", str(DUR),
        "-vf", vf,
        "-c:v", "libx264",
        "-crf", "30",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        out_path,
    ]

    print(f"\nGenerating {name}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: {result.stderr[-500:]}")
        return False
    size = os.path.getsize(out_path) // 1024
    print(f"✅ {name}.mp4 — {size}KB")
    return True


if __name__ == "__main__":
    ok = 0
    for clip in CLIPS:
        if generate(clip):
            ok += 1
    print(f"\n{ok}/{len(CLIPS)} clips generated → {OUT}/")
