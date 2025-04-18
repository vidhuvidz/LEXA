"use client";

import { useEffect, useState } from "react";

interface TypingTextProps {
  text: string;
}

export default function TypingText({ text }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20); // Typing speed in ms

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
}
