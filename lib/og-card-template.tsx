import React from "react";
import { NOISE_PNG } from "./data";
export type OGCardData = {
  title: string;
  preview: string;
};

export function renderOGCard({ title, preview }: OGCardData) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ebe8e2",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          display: "flex",
          width: "100%",
          height: "100%",
          opacity: 0.07,
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: -50,
          width: "240px",
          height: "220px",
          display: "flex",
          zIndex: 1,
        }}
      >
        <svg
          width="240"
          height="220"
          viewBox="0 0 109 99"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <g clipPath="url(#clip0_top_left_shared)">
            <path
              d="M21.19 92.23L25.62 88.71L24.9 81.26L30.87 77.44L30.82 73.73L35.4 71.59L36.32 66.55L46.4 62.44L53.35 64.52L56.25 61.92L60.99 63.91L64.29 64.87L69.03 60.74L73.77 59.67L81.11 54.63V48.36L87.22 46.22L88.91 41.33L92.42 41.02L91.96 35.67L93.95 32.77L91.57 30.01L86.53 26.46L87.22 20.99L93.95 18.7L100.68 16.25V13.04L104.19 10.45L102.51 6.63L106.21 4.08L107.17 -1L109 4.73L106.25 8.25L107.93 12.07L104.41 14.67V17.88L97.69 20.32L90.96 22.62L90.35 25.98L95.55 30.87L97.69 34.39L95.7 37.29L96.16 42.64L92.64 42.95L90.96 47.84L84.85 49.98V56.25L77.51 61.29L72.77 62.36L68.03 66.49L61.46 66.95L56.72 64.96L53.81 67.56L46.94 65.42L40.06 68.17L39.14 73.22L34.55 75.36L34.25 78.87L28.29 82.69L29.36 90.34L24.92 93.85L24.62 98.52L21.9 96.3L21.19 92.23Z"
              fill="#644A40"
              fillOpacity="0.2"
            />
            <path
              d="M107.17 -1L106.21 4.08L102.51 6.63L104.19 10.45L100.68 13.04V16.25L93.9499 18.7L87.2199 20.99L86.5299 26.46L91.5699 30.01L93.9499 32.77L91.9599 35.67L92.4199 41.02L88.9099 41.33L87.2199 46.22L81.1099 48.36V54.63L73.7699 59.67L69.0299 60.74L64.2899 64.87L60.9899 63.91L56.2499 61.92L53.3499 64.52L46.3999 62.44L36.3199 66.55L35.3999 71.59L30.8199 73.73L30.8699 77.44L24.8999 81.26L25.6199 88.71L21.1899 92.23L21.8999 96.3L24.6199 98.52H-0.150078V-0.77L107.17 -1Z"
              fill="#644A40"
            />
          </g>
          <defs>
            <clipPath id="clip0_top_left_shared">
              <rect
                width="109"
                height="99"
                fill="white"
                transform="matrix(-1 0 0 1 109 0)"
              />
            </clipPath>
          </defs>
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "120px",
          height: "630px",
          display: "flex",
          zIndex: 1,
        }}
      >
        <svg
          width="120"
          height="630"
          viewBox="0 0 56 180"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <g clipPath="url(#clip0_right_edge_shared)">
            <path
              d="M74.9004 -46.8L0.000389099 -46.8L4.90039 -44.39L5.70039 -41.39L8.70039 -38.93L7.70039 -34.11V-30.39L5.63039 -27L10.9104 -20L18.0704 -19L18.2304 -13.8L25.5704 -12.37L26.9004 -8.8L31.2604 -8.17L32.2604 -2.78L36.3304 1.46C35.8617 3.12441 35.1722 4.71858 34.2804 6.2C33.0804 7.86 33.5404 12.62 33.5404 12.62L29.5404 15.2L26.6704 19.33L25.4704 25.57L23.5804 32.28L25.9904 38.13L28.8004 43.98L27.0804 50.57L28.0804 54.01L25.0804 59.01L28.4604 60.56L27.8304 64.86L31.0404 67.73L37.3404 70.59L36.4304 73.74L37.6904 78.62L35.7104 82.2L36.0604 86.39L33.7104 90.39L33.8204 97.79L31.5304 102.37L29.2404 107.82L22.1904 119.05L24.5404 121.98L23.2804 127.54L24.4204 132.24C24.4204 132.24 25.4904 139.75 28.4204 141.52C31.3504 143.29 34.2704 140.72 37.0704 141.64C39.8704 142.56 41.1404 148.64 46.5904 147.09L49.2504 154.54L48.6204 158.78L51.7704 161.19L49.6504 168.07L52.6504 171.79L48.3504 179.36L49.5004 183.89L43.9904 188.07H74.9004L74.9004 -46.8Z"
              fill="#644A40"
            />
            <path
              d="M48.3807 179.29L52.6807 171.72L49.6807 168L51.8007 161.12L48.6507 158.71L49.2807 154.47L46.6207 147.02C41.1707 148.56 39.9107 142.49 37.1007 141.57C34.2907 140.65 31.4307 143.23 28.4507 141.45C25.4707 139.67 24.4507 132.17 24.4507 132.17L23.3107 127.47L24.5707 121.91L22.2207 118.98L29.2707 107.75L31.5607 102.3L33.8507 97.72L33.7407 90.32L36.0907 86.32L35.7407 82.13L37.8107 78.58L36.5507 73.7L37.4607 70.55L31.1607 67.69L27.9007 64.87L28.5307 60.57L25.1507 59.02L28.1507 54.02L27.1507 50.58L28.8707 43.99L26.0307 38.1L23.6207 32.25L25.5107 25.54L26.7107 19.3L29.5807 15.2L33.5807 12.62C33.5807 12.62 33.1207 7.86 34.3207 6.2C35.2336 4.7348 35.9466 3.15414 36.4407 1.5L32.3307 -2.8L31.3307 -8.19L26.9007 -8.8L25.5307 -12.36L18.2307 -13.8L18.0007 -19.07L10.8407 -20.07L5.56067 -27.07L7.63067 -30.46V-34.18L8.63067 -39L5.63067 -41.46L4.83067 -44.46L0.000663757 -46.8L1.35066 -44.39L2.16067 -41.39L5.16067 -38.93L4.16067 -34.11L4.10066 -30.39L2.03066 -27L7.31067 -20L14.4707 -19L14.6507 -13.8L21.9907 -12.37L23.3707 -8.8L27.7207 -8.17L28.7207 -2.78L32.7907 1.46C32.3072 3.12567 31.6044 4.71965 30.7007 6.2C29.5007 7.86 29.9607 12.62 29.9607 12.62L25.9607 15.2L23.1007 19.33L21.9007 25.54L20.0107 32.25L22.4207 38.1L25.2307 43.95L23.5107 50.54L24.5107 53.98L21.5107 58.98L24.8907 60.53L24.2607 64.83L27.4707 67.7L33.9007 70.6L32.9807 73.75L34.2407 78.63L32.1407 82.2L32.4807 86.39L30.1307 90.39L30.2507 97.79L27.9007 102.3L25.6107 107.75L18.6107 118.98L20.9607 121.91L19.7007 127.47L20.8407 132.17C20.8407 132.17 23.2507 142.17 26.2307 143.98C29.2107 145.79 32.0807 143.17 34.8907 144.09C37.7007 145.01 38.1607 149.77 43.6007 148.22L45.7207 154.47L45.0907 158.71L48.2507 161.12L46.1207 168L49.1207 171.72L44.8207 179.29L45.9007 183.82L43.9707 188L49.4807 183.82L48.3807 179.29Z"
              fill="#644A40"
              fillOpacity="0.2"
            />
          </g>
          <defs>
            <clipPath id="clip0_right_edge_shared">
              <rect
                width="180"
                height="56"
                fill="white"
                transform="matrix(0 1 -1 0 56 0)"
              />
            </clipPath>
          </defs>
        </svg>
      </div>

      <div
        style={{
          position: "relative",
          width: "880px",
          height: "470px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#e7e3d9",
          borderRadius: "0",
          transform: "rotate(-1deg)",
          overflow: "hidden",
          zIndex: 3,
          border: "1px solid #644A40",
          marginRight: "70px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            backgroundImage: `url(${NOISE_PNG})`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
            display: "flex",
            width: "100%",
            height: "100%",
            opacity: 0.07,
            mixBlendMode: "multiply",
            zIndex: 5,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "30px",
            width: "2px",
            backgroundColor: "rgba(234, 50, 49, 0.65)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "30px 55px",
            zIndex: 2,
            height: "100%",
          }}
        >
          <p
            style={{
              position: "relative",
              fontSize: 44,
              lineHeight: 0.3,
              fontWeight: 700,
              color: "#644A40",
              letterSpacing: "-0.5px",
              marginLeft: "65px",
              marginBottom: "60px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "-65px",
                top: "-24px",
              }}
            >
              <svg
                width="100"
                height="100"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.5 0.5H44.5V44.5H0.5V0.5Z"
                  fill="#F9F9F9"
                  stroke="#644A40"
                />
                <path
                  d="M3.96191 40.8577L3.96191 44.8577L11.9619 44.8577L11.9619 40.8577L7.96191 40.8577L3.96191 40.8577ZM11.9619 9.07995C11.9619 6.87081 10.1711 5.07995 7.96191 5.07995C5.75277 5.07995 3.96191 6.87081 3.96191 9.07995L7.96191 9.07995L11.9619 9.07995ZM7.96191 40.8577L11.9619 40.8577L11.9619 9.07995L7.96191 9.07995L3.96191 9.07995L3.96191 40.8577L7.96191 40.8577Z"
                  fill="#644A40"
                />
                <path
                  d="M36.4619 22.9499V4.09275"
                  stroke="#644A40"
                  stroke-width="8"
                  stroke-linecap="square"
                />
                <path
                  d="M10.8945 6.69705C9.70014 5.22942 7.67079 5.1259 6.3331 6.46418C4.96712 7.83089 4.84763 10.1725 6.06727 11.6713L22.5842 31.9675C22.9655 32.436 23.1137 32.6135 23.2806 32.7491C23.4363 32.8755 23.6056 32.9773 23.7835 33.0515C23.9716 33.13 24.1798 33.1687 24.7454 33.2679L28.5881 33.9412L28.3732 29.5691C28.3424 28.9402 28.3289 28.6889 28.2736 28.4561C28.2224 28.2407 28.1447 28.0357 28.0446 27.846C27.9375 27.6431 27.7913 27.46 27.4115 26.9933L10.8945 6.69705Z"
                  fill="#644A40"
                  stroke="#644A40"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            Notevo.me
          </p>
          <p
            style={{
              position: "absolute",
              fontSize: 16,
              fontWeight: 700,
              color: "#4a372f",
              left: "44px",
              bottom: "0px",
            }}
          >
            Copyright © 2025-{new Date().getFullYear()} Notevo. All rights
            reserved.
          </p>

          <div
            style={{
              fontSize: title.length > 40 ? 52 : 60,
              fontWeight: 700,
              lineHeight: 1,
              color: "#4a372f",
              letterSpacing: "-1px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: "16px",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 32,
              lineHeight: 1.35,
              fontWeight: 400,
              color: "#3a2a24",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginLeft: "6px",
              maxWidth: "600px",
            }}
          >
            {preview}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "45px",
          right: "40px",
          width: "310px",
          height: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#b1cbc2",
          borderRadius: "0",
          transform: "rotate(-1deg)",
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(234, 50, 49, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(234, 50, 49, 0.5) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <svg
          width="140"
          height="200"
          viewBox="0 0 100 180"
          fill="none"
          stroke="#4a372f"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: "absolute",
            right: "40px",
            bottom: "20px",
            opacity: 0.85,
            transform: "rotate(4deg)",
          }}
        >
          <path d="M85 20 C 35 15, 10 28, 20 45 C 38 62, 88 52, 78 72 C 68 92, 18 82, 28 102 C 38 122, 88 112, 78 132 C 68 152, 18 142, 35 168" />
        </svg>
      </div>
    </div>
  );
}
