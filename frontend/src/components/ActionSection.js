"use client";

export default function ActionSection({ onSave }) {
  return (
    <button
      onClick={onSave}
      className="px-6 py-2 bg-green-500 text-white rounded"
    >
      Test Save Answer
    </button>
  );
}