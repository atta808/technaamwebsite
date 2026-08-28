import assert from "node:assert/strict";

function parseTechnologyInput(input) {
  if (!input) return [];
  // Split on comma, semicolon, or newline
  return input
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

let failures = 0;

function runTest(name, input, expected) {
  try {
    const result = parseTechnologyInput(input);
    assert.deepEqual(result, expected);
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    failures++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, parseTechnologyInput(input));
  }
}

console.log("Running Roast Parsing Tests...\n");

runTest("Single item", "Cursor", ["Cursor"]);
runTest("Comma separated", "Next.js, Supabase, Firebase, Vercel, Cursor", ["Next.js", "Supabase", "Firebase", "Vercel", "Cursor"]);
runTest("Semicolon separated", "Next.js; Supabase; Cursor", ["Next.js", "Supabase", "Cursor"]);
runTest("Newline separated", "Next.js\nSupabase\nCursor", ["Next.js", "Supabase", "Cursor"]);
runTest("Windows newline separated", "Next.js\r\nSupabase\r\nCursor", ["Next.js", "Supabase", "Cursor"]);
runTest("Empty separators ignored", "Next.js, \n; Supabase;;,Cursor\n", ["Next.js", "Supabase", "Cursor"]);
runTest("Duplicates unchanged (raw output has duplicates if input has them)", "React, React", ["React", "React"]);
runTest("Spaces preserved (Google Cloud)", "Google Cloud", ["Google Cloud"]);
runTest("Spaces preserved (Visual Studio Code)", "Visual Studio Code", ["Visual Studio Code"]);
runTest("Spaces preserved (React Native)", "React Native", ["React Native"]);

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n✅ All parsing tests passed!`);
}
