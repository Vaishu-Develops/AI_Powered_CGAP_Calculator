'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  // split text into characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    };
  });

  const renderWords = () => {
    return (
      <div className="inline">
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block whitespace-nowrap">
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn(`text-black dark:text-white `, word.className)}
                >
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <motion.div
        className="overflow-hidden pb-1"
        initial={{
          width: "0%",
        }}
        whileInView={{
          width: "fit-content",
        }}
        viewport={{ once: true }}
        transition={{
          duration: 1.5,
          ease: "linear",
          delay: 0.5,
        }}
      >
        <div
          className="text-2xl md:text-5xl lg:text-[5.5rem] font-bold"
          style={{
            whiteSpace: "nowrap",
          }}
        >
          {renderWords()}{" "}
        </div>{" "}
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "block rounded-sm w-[4px] h-8 md:h-12 lg:h-[5.5rem] bg-primary",
          cursorClassName
        )}
      ></motion.span>
    </div>
  );
};
