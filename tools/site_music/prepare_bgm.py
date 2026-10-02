"""Prepare the approved Suno master for a repeating website background track."""

import argparse
import json
from pathlib import Path
import subprocess
import tempfile


def ffmpeg(*args):
    return subprocess.run(
        ['ffmpeg', '-hide_banner', '-nostats', '-y', *map(str, args)],
        check=True, capture_output=True, text=True,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    # The source fades to silence after 190 s. Blend its last six useful seconds
    # into its first six, then place that blend after the middle. The final sample
    # flows into the beginning of the middle on repeat, without an ending pause.
    filters = (
        '[0:a]asplit=3[m][t][h];'
        '[m]atrim=start=6:end=184,asetpts=PTS-STARTPTS[mid];'
        '[t]atrim=start=184:end=190,asetpts=PTS-STARTPTS[tail];'
        '[h]atrim=start=0:end=6,asetpts=PTS-STARTPTS[head];'
        '[tail][head]acrossfade=d=6:c1=qsin:c2=qsin[seam];'
        '[mid][seam]concat=n=2:v=0:a=1[loop]'
    )
    with tempfile.TemporaryDirectory(prefix='portfolio-bgm-') as directory:
        loop = Path(directory) / 'loop.wav'
        ffmpeg('-i', args.source, '-filter_complex', filters, '-map', '[loop]',
               '-map_metadata', '-1', '-c:a', 'pcm_f32le', loop)
        analysis = ffmpeg('-i', loop, '-af',
                          'loudnorm=I=-18:TP=-2:LRA=11:print_format=json', '-f', 'null', '-')
        stats, _ = json.JSONDecoder().raw_decode(analysis.stderr[analysis.stderr.rfind('{'):])
        normalize = (
            'loudnorm=I=-18:TP=-2:LRA=11:linear=true:'
            f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}"
        )
        ffmpeg('-i', loop, '-af', normalize, '-ar', '48000', '-ac', '2',
               '-c:a', 'libmp3lame', '-b:a', '160k', '-map_metadata', '-1',
               '-metadata', 'title=Afternoon Warmthaw', args.output)
    print(f'{args.output}: {args.output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
