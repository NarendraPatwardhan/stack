import { assert } from "console";

enum Ops {
  Push = 0,
  Plus,
  Minus,
  Dump,
  Count,
}

type instruction = [Ops, ...any];

const push = (x: any): instruction => {
  return [Ops.Push, x];
};

const plus = (): instruction => {
  return [Ops.Plus, null];
};

const minus = (): instruction => {
  return [Ops.Minus, null];
};

const dump = (): instruction => {
  return [Ops.Dump, null];
};

const simulate = (program: instruction[]) => {
  let stack: any[] = [];
  let arg0: any;
  let arg1: any;

  for (const [op, ...args] of program) {
    assert(Ops.Count == 4, "Exhastive handling of operations is expected");
    switch (op) {
      case Ops.Push:
        stack.push(args[0]);
        break;
      case Ops.Plus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg0 + arg1);
        break;
      case Ops.Minus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 - arg0);
        break;
      case Ops.Dump:
        arg0 = stack.pop();
        console.log(arg0);
        break;
    }
  }
};

const compile = async (program: instruction[], out: string) => {
  const file = Bun.file(out + ".asm");
  const writer = file.writer();
  writer.write("segment .text\n");
  writer.write("dump:\n");
  writer.write("  mov     r9, -3689348814741910323\n");
  writer.write("  sub     rsp, 40\n");
  writer.write("  mov     BYTE [rsp+31], 10\n");
  writer.write("  lea     rcx, [rsp+30]\n");
  writer.write(".L2:\n");
  writer.write("  mov     rax, rdi\n");
  writer.write("  lea     r8, [rsp+32]\n");
  writer.write("  mul     r9\n");
  writer.write("  mov     rax, rdi\n");
  writer.write("  sub     r8, rcx\n");
  writer.write("  shr     rdx, 3\n");
  writer.write("  lea     rsi, [rdx+rdx*4]\n");
  writer.write("  add     rsi, rsi\n");
  writer.write("  sub     rax, rsi\n");
  writer.write("  add     eax, 48\n");
  writer.write("  mov     BYTE [rcx], al\n");
  writer.write("  mov     rax, rdi\n");
  writer.write("  mov     rdi, rdx\n");
  writer.write("  mov     rdx, rcx\n");
  writer.write("  sub     rcx, 1\n");
  writer.write("  cmp     rax, 9\n");
  writer.write("  ja      .L2\n");
  writer.write("  lea     rax, [rsp+32]\n");
  writer.write("  mov     edi, 1\n");
  writer.write("  sub     rdx, rax\n");
  writer.write("  lea     rsi, [rsp+32+rdx]\n");
  writer.write("  mov     rdx, r8\n");
  writer.write("  mov     rax, 1\n");
  writer.write("  syscall\n");
  writer.write("  add     rsp, 40\n");
  writer.write("  ret\n");

  writer.write("global _start\n");
  writer.write("_start:\n");

  for (const [op, ...args] of program) {
    assert(Ops.Count == 4, "Exhastive handling of operations is expected");
    switch (op) {
      case Ops.Push:
        writer.write("  ;;-- push " + args[0] + " --\n");
        writer.write("  push " + args[0] + "\n");
        break;
      case Ops.Plus:
        writer.write("  ;;-- plus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  add rax, rbx\n");
        writer.write("  push rax\n");
        break;
      case Ops.Minus:
        writer.write("  ;;-- minus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  sub rbx, rax\n");
        writer.write("  push rbx\n");
        break;
      case Ops.Dump:
        writer.write("  ;;-- dump --\n");
        writer.write("  pop rdi\n");
        writer.write("  call dump\n");
        break;
    }
  }

  writer.write("  mov rax, 60\n");
  writer.write("  mov rdi, 0\n");
  writer.write("  syscall\n");

  writer.end();
  console.log("CMD: nasm -felf64 " + out + ".asm");
  const nasm = Bun.spawn({
    cmd: ["nasm", "-felf64", out + ".asm"],
  });
  await nasm.exited;

  console.log("CMD: ld -o " + out + " " + out + ".o");
  const link = Bun.spawn({
    cmd: ["ld", "-o", out, out + ".o"],
  });

  await link.exited;

  console.log("CMD:" + out);
  const prog = Bun.spawn({
    cmd: [out],
  });
  const res = await new Response(prog.stdout).text();
  console.log(res.trim());
};

const parse_token_as_instruction = (
  token: [string, number, number, string],
) => {
  switch (token[3]) {
    case ".":
      return dump();
    case "+":
      return plus();
    case "-":
      return minus();
    default:
      if (token[3].match(/^[0-9]+$/)) {
        return push(parseInt(token[3]));
      } else {
        console.error(
          `ERROR: Unknown token ${token[3]} at ${token[0]}:${token[1]}:${
            token[2]
          }`,
        );
        process.exit(1);
      }
  }
};

const load_program_from_file = async (path: string) => {
  const lexed = await lex_file(path);
  const program = lexed.map(parse_token_as_instruction);
  return program;
};

const collect_cols = (
  line: string,
  col: number,
  predicate: (c: string) => RegExpMatchArray | boolean | null,
) => {
  while (col < line.length && predicate(line[col])) {
    col++;
  }
  return col;
};

const lex_line = (path: string, line_number: number, line: string) => {
  let col = 0;
  let start = 0;
  let res: [string, number, number, string][] = [];
  while (col < line.length) {
    col = collect_cols(line, col, (c) => c.match(/\s/));
    if (col >= line.length) break;
    start = col;
    col = collect_cols(line, col, (c) => !c.match(/\s/));
    res.push([path, line_number, start, line.slice(start, col)]);
  }
  return res;
};

const lex_file = async (path: string) => {
  const file = Bun.file(path);
  const text = await file.text();
  const lines = text.split("\n");
  return lines.map((
    line,
    line_number,
  ) => lex_line(path, line_number, line)).flat();
};

const usage = () => {
  console.log("Usage: bun run <SUBCOMMAND> [ARGS]");
  console.log("SUBCOMMANDS:");
  console.log("   sim <file>      Simulate the program");
  console.log("   com <file> [out]      Compile the program");
};

const main = async () => {
  const argc = Bun.argv.length;
  const argv = Bun.argv;
  if (argc < 3) {
    usage();
    console.error("ERROR: No subcommand provided");
    process.exit(1);
  }

  const subcmd = argv[2];

  if (argc < 4) {
    usage();
    console.error("ERROR: No file provided");
    process.exit(1);
  }

  const file = argv[3];

  if (subcmd == "sim") {
    const program = await load_program_from_file(file);
    simulate(program);
  } else if (subcmd == "com") {
    let out: string = "out";
    if (argc > 4) out = argv[4];
    const program = await load_program_from_file(file);
    await compile(program, out);
  } else {
    usage();
    console.error(`Unknown subcommand: ${subcmd}`);
    process.exit(1);
  }
};

await main();
