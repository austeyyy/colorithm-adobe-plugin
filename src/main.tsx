import React, { useEffect, useState } from "react";
import { photoshop } from "./globals";
import { api } from "./api/api";
import { action, core, app } from "photoshop";

import "./app.css";

interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export const App = () => {
  const [dominantColor, setDominantColor] = useState<Color | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [palette, setPalette] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // useEffect(() => {
  //   const getBaseColor = async () => {
  //     const fg = app.foregroundColor;

  //     const foregroundColor = {
  //       hex: `#${fg.rgb.hexValue}`,
  //       rgb: { r: fg.rgb.red, g: fg.rgb.green, b: fg.rgb.blue },
  //     };

  //     setDominantColor(foregroundColor);
  //   };

  //   getBaseColor();
  // }, []);

  // Extract base color from user's foreground swatch
  const extractColor = async () => {
    try {
      await core.executeAsModal(
        async () => {
          const doc = app.activeDocument;
          if (!doc) {
            throw new Error("No document open");
          }

          const fg = app.foregroundColor; // grab selected color and store

          const foregroundColor = {
            hex: `#${fg.rgb.hexValue}`,
            rgb: { r: fg.rgb.red, g: fg.rgb.green, b: fg.rgb.blue },
          };

          await generateAIPalette(foregroundColor);
          setDominantColor(foregroundColor);
          setSelectedColor(null); // reset selections after respin
        },
        { commandName: "Extract Color" }
      );
    } catch (error) {
      console.error("extractColor error caught:", error);
      api.notify(`Error: ${error ?? JSON.stringify(error) ?? String(error)}`);
    }
  };

  const respinSelected = async () => {
    setDominantColor(selectedColor);
    await generateAIPalette(selectedColor!);
  };

  // Generate palette through ColorMind API proxy server
  const generateAIPalette = async (baseColor: Color) => {
    setIsLoading(true);
    try {
      console.log("Calling API with baseColor:", baseColor);
      const response = await fetch(
        "https://colormind-proxy.vercel.app/colormind",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: [
              [baseColor.rgb.r, baseColor.rgb.g, baseColor.rgb.b],
              "N",
              "N",
              "N",
              "N",
            ],
            model: "default",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API response JSON:", data);

      if (!data?.result) {
        throw new Error("No 'result' in API response");
      }

      const colors: Color[] = data.result.map((rgb: number[]) => ({
        hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
        rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
      }));

      setPalette(colors);
    } catch (error) {
      console.error("generateAIPalette error caught:", error);
      api.notify(`Error: ${error ?? JSON.stringify(error) ?? String(error)}`);
      setPalette([]); // clear palette on error
    } finally {
      setIsLoading(false);
    }
  };

  // Convert RGB to a string of hexcode
  function rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  // grab selected pallete color
  const copyHex = (color: Color) => {
    navigator.clipboard.writeText(color.hex); // copy hex to clipboard
    api.notify(`Set as foreground and copied ${color.hex} to clipboard!`);
  };

  const setForeground = async (color: Color) => {
    const rgbColor = {
      _obj: "RGBColor",
      red: color.rgb.r,
      green: color.rgb.g,
      blue: color.rgb.b,
    };

    // set foreground to selected color via batchplay
    await core.executeAsModal(
      async () => {
        await action.batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "color", _property: "foregroundColor" }],
              to: rgbColor,
            },
          ],
          { modalBehavior: "execute" }
        );
      },
      { commandName: "Set Foreground Color" }
    );

    api.notify(`Set foreground to ${color.hex}`);
  };

  return (
    <main className="app">
      <h1>Colorithm</h1>

      <button onClick={extractColor} disabled={isLoading}>
        {isLoading ? "Generating..." : "Extract Color & Generate Palette"}
      </button>

      {/* Conditionally render once palette is generated */}
      {dominantColor && (
        <div className="results">
          {/* Base Color */}
          <h3>Base Color</h3>
          <div
            className="base-color-box"
            style={{ backgroundColor: dominantColor.hex }}
          >
            <span>{dominantColor.hex}</span>
          </div>
          {/* AI Generated Palette */}
          <h3>Generated Palette:</h3>

          <div className="palette">
            {palette.map((color, index) => (
              <div
                key={index}
                className={`color-box ${selectedColor?.hex === color.hex ? "selected" : ""}`} // conditionally set to selected
                style={{ backgroundColor: color.hex }}
                title={`RGB: ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`}
                onClick={() => {
                  setSelectedColor(color);
                  //setDominantColor(color);
                }}
              >
                <span>{color.hex}</span>
              </div>
            ))}
          </div>

          {/*Buttons disabled until color is selected */}
          <div className="btn-row">
            <button
              disabled={!selectedColor}
              onClick={() => selectedColor && setForeground(selectedColor)}
            >
              Set Foreground
            </button>

            <button
              disabled={!selectedColor}
              onClick={() => selectedColor && copyHex(selectedColor)}
            >
              Copy Hex
            </button>
            <button disabled={!selectedColor} onClick={respinSelected}>
              Respin
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
