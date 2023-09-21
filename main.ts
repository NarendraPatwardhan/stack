import { assert } from "console";

enum Ops {
  Push = 0,
  Plus,
  Minus,
  Equal,
  Gt,
  Lt,
  Dump,
  If,
  Else,
  While,
  Do,
  End,
  Dup,
  Count,
}

const Str2Op: Record<string, Ops> = {
  ".": Ops.Dump,
  "+": Ops.Plus,
  "-": Ops.Minus,
  "=": Ops.Equal,
  ">": Ops.Gt,
  "<": Ops.Lt,
  "if": Ops.If,
  "else": Ops.Else,
  "while": Ops.While,
  "do": Ops.Do,
  "end": Ops.End,
  "dup": Ops.Dup,
};

interface Loc {
  path: string;
  row: number;
  col: number;
}

interface Token {
  text: string;
  loc: Loc;
}

interface Instruction {
  op: Ops;
  loc: Loc;
  value?: any;
  jump?: number;
}

const simulate = (program: Instruction[]) => {
  let stack: any[] = [];
  let arg0: any;
  let arg1: any;

  let i = 0;
  while (i < program.length) {
    assert(
      Ops.Count == 13,
      "Exhastive handling of operations is expected in simulate",
    );
    const { op, ...rest } = program[i];
    switch (op) {
      case Ops.Push:
        stack.push(rest.value);
        i++;
        break;
      case Ops.Plus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg0 + arg1);
        i++;
        break;
      case Ops.Minus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 - arg0);
        i++;
        break;
      case Ops.Equal:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg0 == arg1) ? 1 : 0);
        i++;
        break;
      case Ops.Gt:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg1 > arg0) ? 1 : 0);
        i++;
        break;
      case Ops.Lt:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg1 < arg0) ? 1 : 0);
        i++;
        break;
      case Ops.Dump:
        arg0 = stack.pop();
        console.log(arg0);
        i++;
        break;
      case Ops.If:
        arg0 = stack.pop();
        if (arg0 == 0) {
          i = rest.jump!;
        } else {
          i++;
        }
        break;
      case Ops.Else:
        i = rest.jump!;
        break;
      case Ops.While:
        i++;
        break;
      case Ops.Do:
        arg0 = stack.pop();
        if (arg0 == 0) {
          i = rest.jump!;
        } else {
          i++;
        }
        break;
      case Ops.End:
        i = rest.jump!;
        break;
      case Ops.Dup:
        arg0 = stack.pop();
        stack.push(arg0);
        stack.push(arg0);
        i++;
        break;
    }
  }
};

const compile = async (program: Instruction[], out: string) => {
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

  const end = program.length;
  let i = 0;
  while (i < end) {
    const { op, ...rest } = program[i];
    assert(
      Ops.Count == 13,
      "Exhastive handling of operations is expected in compile",
    );
    writer.write("addr_" + i + ":\n");
    switch (op) {
      case Ops.Push:
        writer.write("  ;;-- push " + rest.value + " --\n");
        writer.write("  push " + rest.value + "\n");
        i++;
        break;
      case Ops.Plus:
        writer.write("  ;;-- plus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  add rax, rbx\n");
        writer.write("  push rax\n");
        i++;
        break;
      case Ops.Minus:
        writer.write("  ;;-- minus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  sub rbx, rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Ops.Equal:
        writer.write("  ;;-- equal --\n");
        writer.write("  mov rcx, 0\n");
        writer.write("  mov rdx, 1\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  cmp rbx, rax\n");
        writer.write("  cmove rcx, rdx\n");
        writer.write("  push rcx\n");
        i++;
        break;
      case Ops.Gt:
        writer.write("  ;;-- gt --\n");
        writer.write("  mov rcx, 0\n");
        writer.write("  mov rdx, 1\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  cmp rbx, rax\n");
        writer.write("  cmovg rcx, rdx\n");
        writer.write("  push rcx\n");
        i++;
        break;
      case Ops.Lt:
        writer.write("  ;;-- lt --\n");
        writer.write("  mov rcx, 0\n");
        writer.write("  mov rdx, 1\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  cmp rbx, rax\n");
        writer.write("  cmovl rcx, rdx\n");
        writer.write("  push rcx\n");
        i++;
        break;
      case Ops.If:
        writer.write("  ;;-- if --\n");
        writer.write("  pop rax\n");
        writer.write("  test rax, rax\n");
        writer.write("  jz addr_" + rest.jump + "\n");
        i++;
        break;
      case Ops.Else:
        writer.write("  ;;-- else --\n");
        writer.write("  jmp addr_" + rest.jump + "\n");
        i++;
        break;
      case Ops.While:
        writer.write("  ;;-- while --\n");
        i++;
        break;
      case Ops.Do:
        writer.write("  ;;-- do --\n");
        writer.write("  pop rax\n");
        writer.write("  test rax, rax\n");
        writer.write("  jz addr_" + rest.jump + "\n");
        i++;
        break;
      case Ops.End:
        writer.write("  ;;-- end --\n");
        if (i + 1 != rest.jump) {
          writer.write("  jmp addr_" + rest.jump + "\n");
        }
        i++;
        break;
      case Ops.Dup:
        writer.write("  ;;-- dup --\n");
        writer.write("  pop rax\n");
        writer.write("  push rax\n");
        writer.write("  push rax\n");
        i++;
        break;
      case Ops.Dump:
        writer.write("  ;;-- dump --\n");
        writer.write("  pop rdi\n");
        writer.write("  call dump\n");
        i++;
        break;
    }
  }

  writer.write("  ;;-- exit --\n");
  writer.write("addr_" + i + ":\n");
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
  const trimmed = res.trim();
  if (trimmed != "") {
    console.log(trimmed);
  }
};

const crossref = (program: Instruction[]) => {
  let stack = [];
  let start_location: number | undefined;

  for (const [i, { op, ...rest }] of program.entries()) {
    assert(
      Ops.Count == 13,
      "Exhastive handling of operations is expected in crossref",
    );
    switch (op) {
      case Ops.If:
        stack.push(i);
        break;
      case Ops.Else:
        let if_location = stack.pop();
        if (if_location == undefined || program[if_location].op != Ops.If) {
          console.error(
            `ERROR: Unmatched else at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        program[if_location].jump = i + 1;
        stack.push(i);
        break;
      case Ops.While:
        stack.push(i);
        break;
      case Ops.Do:
        start_location = stack.pop();
        if (
          start_location == undefined ||
          program[start_location].op != Ops.While
        ) {
          console.error(
            `ERROR: Unmatched do at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        program[i].jump = start_location;
        stack.push(i);
        break;
      case Ops.End:
        start_location = stack.pop();
        if (start_location == undefined) {
          console.error(
            `ERROR: Unmatched end at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        if (
          program[start_location].op == Ops.If ||
          program[start_location].op == Ops.Else
        ) {
          program[start_location].jump = i;
          program[i].jump = i + 1;
        } else if (program[start_location].op == Ops.Do) {
          program[i].jump = program[start_location].jump;
          program[start_location].jump = i + 1;
        }
        break;
    }
  }

  if (stack.length > 0) {
    console.error(
      "ERROR: One or more blocks are not closed with end instructions",
    );
    process.exit(1);
  }

  return program;
};

const parse_token_as_instruction = (
  token: Token,
): Instruction => {
  assert(
    Ops.Count == 13,
    "Exhastive handling of operations is expected in parsing tokens",
  );

  const { text, loc } = token;

  if (text in Str2Op) {
    return { op: Str2Op[text], loc };
  }

  if (text.match(/^[0-9]+$/)) {
    return { op: Ops.Push, loc, value: parseInt(text) };
  } else {
    console.error(
      `ERROR: Unknown token ${text} at ${loc.path}:${loc.row}:${loc.col}`,
    );
    process.exit(1);
  }
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

const lex_line = (path: string, row: number, line: string) => {
  let col = 0;
  let start = 0;
  let res: Token[] = [];
  while (col < line.length) {
    col = collect_cols(line, col, (c) => c.match(/\s/));
    if (col >= line.length) break;
    start = col;
    col = collect_cols(line, col, (c) => !c.match(/\s/));
    res.push({
      text: line.substring(start, col),
      loc: {
        path,
        row,
        col: start,
      },
    });
  }
  return res;
};

const lex_file = async (path: string) => {
  const file = Bun.file(path);
  const text = await file.text();
  const lines = text.split("\n").map((line) => line.split("//")[0]);
  return lines.map((
    line,
    row,
  ) => lex_line(path, row, line)).flat();
};

const load_program_from_file = async (path: string) => {
  const lexed = await lex_file(path);
  const program = lexed.map(parse_token_as_instruction);
  return crossref(program);
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
    let out: string = "./build/out";
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
