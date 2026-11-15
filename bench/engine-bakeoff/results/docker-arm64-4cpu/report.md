# Engine bake-off results: docker-arm64-4cpu

- Date (UTC): 2026-11-14T17:12:34Z
- Machine: aarch64 (Linux), cgroup CPU limit 4, os.cpu_count 10
- Engine runtime: sherpa-onnx 1.13.8
- RTF is synthesis time divided by audio duration (lower is better). TTFA is time to the first audio callback for one segment of about 60 characters. Peak RSS is per process, one model loaded.

| Candidate | Voice | Lang | Threads | Load s | TTFA ms | RTF | RTF spread % | Peak RSS MiB | Chunked inside segment |
|---|---|---|---|---|---|---|---|---|---|
| kokoro-v1.0-fp32 | af_heart | en-US | 1 | 2.66 | 3956 | 1.0031 | 12.0 | 683 | no |
| kokoro-v1.0-fp32 | af_heart | en-US | 4 | 1.42 | 1020 | 0.3463 | 31.8 | 683 | no |
| kokoro-v1.0-fp32 | hf_alpha | en-IN | 1 | 2.66 | 3564 | 1.1361 | 111.9 | 683 | no |
| kokoro-v1.0-fp32 | hf_alpha | en-IN | 4 | 1.42 | 1360 | 0.3234 | 15.3 | 683 | no |
| kokoro-v1.0-fp32 | hf_alpha | hi | 1 | 5.43 | 6829 | 1.4621 | 56.8 | 845 | no |
| kokoro-v1.0-fp32 | hf_alpha | hi | 4 | 2.09 | 4066 | 0.803 | 82.2 | 843 | no |
| kokoro-v1.0-int8 | af_heart | en-US | 1 | 1.27 | 3842 | 1.1919 | 9.8 | 504 | no |
| kokoro-v1.0-int8 | af_heart | en-US | 4 | 1.10 | 3246 | 1.1237 | 15.5 | 504 | no |
| kokoro-v1.0-int8 | hf_alpha | en-IN | 1 | 1.27 | 5046 | 1.2002 | 2.4 | 504 | no |
| kokoro-v1.0-int8 | hf_alpha | en-IN | 4 | 1.10 | 3992 | 1.0546 | 10.3 | 504 | no |
| kokoro-v1.0-int8 | hf_alpha | hi | 1 | 0.92 | 5527 | 1.156 | 11.9 | 678 | no |
| kokoro-v1.0-int8 | hf_alpha | hi | 4 | 0.86 | 4694 | 1.1329 | 18.2 | 675 | no |
| matcha-icefall-en_US-ljspeech | matcha-ljspeech | en-US | 1 | 0.81 | 452 | 0.0912 | 34.3 | 257 | no |
| matcha-icefall-en_US-ljspeech | matcha-ljspeech | en-US | 4 | 0.94 | 263 | 0.0314 | 41.4 | 242 | no |
| piper-en_US-lessac-medium | en_US-lessac-medium | en-US | 1 | 0.51 | 306 | 0.0905 | 6.2 | 267 | no |
| piper-en_US-lessac-medium | en_US-lessac-medium | en-US | 4 | 0.87 | 155 | 0.0373 | 2.3 | 302 | no |
| piper-en_US-ljspeech-medium | en_US-ljspeech-medium | en-US | 1 | 0.75 | 281 | 0.09 | 6.6 | 346 | no |
| piper-en_US-ljspeech-medium | en_US-ljspeech-medium | en-US | 4 | 0.80 | 131 | 0.0442 | 33.8 | 341 | no |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | en-IN | 1 | 0.56 | 577 | 0.0914 | 26.9 | 337 | no |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | en-IN | 4 | 0.56 | 238 | 0.0551 | 106.9 | 407 | no |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | hi | 1 | 0.56 | 543 | 0.1078 | 12.3 | 337 | no |
| piper-hi_IN-pratham-medium | hi_IN-pratham-medium | hi | 4 | 0.56 | 214 | 0.0428 | 46.1 | 407 | no |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | en-IN | 1 | 0.67 | 388 | 0.0792 | 8.6 | 386 | no |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | en-IN | 4 | 0.43 | 131 | 0.0363 | 25.0 | 387 | no |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | hi | 1 | 0.67 | 571 | 0.1648 | 89.1 | 386 | no |
| piper-hi_IN-priyamvada-medium | hi_IN-priyamvada-medium | hi | 4 | 0.43 | 157 | 0.0347 | 11.9 | 387 | no |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | en-IN | 1 | 0.66 | 734 | 0.1131 | 41.0 | 439 | no |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | en-IN | 4 | 0.57 | 227 | 0.0776 | 5.9 | 360 | no |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | hi | 1 | 0.66 | 618 | 0.2004 | 0.4 | 439 | no |
| piper-hi_IN-rohan-medium | hi_IN-rohan-medium | hi | 4 | 0.57 | 285 | 0.0627 | 26.9 | 360 | no |
