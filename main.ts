import { assert } from "console";

enum Op {
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
  Mem,
  Count,
}

const strToOp: Record<string, Op> = {
  ".": Op.Dump,
  "+": Op.Plus,
  "-": Op.Minus,
  "=": Op.Equal,
  ">": Op.Gt,
  "<": Op.Lt,
  "if": Op.If,
  "else": Op.Else,
  "while": Op.While,
  "do": Op.Do,
  "end": Op.End,
  "dup": Op.Dup,
  "mem": Op.Mem,
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
  op: Op;
  loc: Loc;
  value?: any;
  jump?: number;
}

const simulate = (program: Instruction[], runOpts: RunOptions) => {
  let stack: any[] = [];
  let arg0: any;
  let arg1: any;

  let i = 0;
  while (i < program.length) {
    assert(
      Op.Count == 13,
      "Exhastive handling of operations is expected in simulate",
    );
    const { op, ...rest } = program[i];
    switch (op) {
      case Op.Push:
        stack.push(rest.value);
        i++;
        break;
      case Op.Plus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg0 + arg1);
        i++;
        break;
      case Op.Minus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 - arg0);
        i++;
        break;
      case Op.Equal:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg0 == arg1) ? 1 : 0);
        i++;
        break;
      case Op.Gt:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg1 > arg0) ? 1 : 0);
        i++;
        break;
      case Op.Lt:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg1 < arg0) ? 1 : 0);
        i++;
        break;
      case Op.Dump:
        arg0 = stack.pop();
        console.log(arg0);
        i++;
        break;
      case Op.If:
        arg0 = stack.pop();
        if (arg0 == 0) {
          i = rest.jump!;
        } else {
          i++;
        }
        break;
      case Op.Else:
        i = rest.jump!;
        break;
      case Op.While:
        i++;
        break;
      case Op.Do:
        arg0 = stack.pop();
        if (arg0 == 0) {
          i = rest.jump!;
        } else {
          i++;
        }
        break;
      case Op.End:
        i = rest.jump!;
        break;
      case Op.Dup:
        arg0 = stack.pop();
        stack.push(arg0);
        stack.push(arg0);
        i++;
        break;
    }
  }
};

const compile = async (
  program: Instruction[],
  runOpts: RunOptions,
) => {
  const file = Bun.file(runOpts.outPrefix + ".asm");
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
      Op.Count == 14,
      "Exhastive handling of operations is expected in compile",
    );
    writer.write("addr_" + i + ":\n");
    switch (op) {
      case Op.Push:
        writer.write("  ;;-- push " + rest.value + " --\n");
        writer.write("  push " + rest.value + "\n");
        i++;
        break;
      case Op.Plus:
        writer.write("  ;;-- plus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  add rax, rbx\n");
        writer.write("  push rax\n");
        i++;
        break;
      case Op.Minus:
        writer.write("  ;;-- minus --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  sub rbx, rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Equal:
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
      case Op.Gt:
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
      case Op.Lt:
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
      case Op.If:
        writer.write("  ;;-- if --\n");
        writer.write("  pop rax\n");
        writer.write("  test rax, rax\n");
        writer.write("  jz addr_" + rest.jump + "\n");
        i++;
        break;
      case Op.Else:
        writer.write("  ;;-- else --\n");
        writer.write("  jmp addr_" + rest.jump + "\n");
        i++;
        break;
      case Op.While:
        writer.write("  ;;-- while --\n");
        i++;
        break;
      case Op.Do:
        writer.write("  ;;-- do --\n");
        writer.write("  pop rax\n");
        writer.write("  test rax, rax\n");
        writer.write("  jz addr_" + rest.jump + "\n");
        i++;
        break;
      case Op.End:
        writer.write("  ;;-- end --\n");
        if (i + 1 != rest.jump) {
          writer.write("  jmp addr_" + rest.jump + "\n");
        }
        i++;
        break;
      case Op.Dup:
        writer.write("  ;;-- dup --\n");
        writer.write("  pop rax\n");
        writer.write("  push rax\n");
        writer.write("  push rax\n");
        i++;
        break;
      case Op.Dump:
        writer.write("  ;;-- dump --\n");
        writer.write("  pop rdi\n");
        writer.write("  call dump\n");
        i++;
        break;
      case Op.Mem:
        writer.write("  ;;-- mem --\n");
        writer.write("  push mem\n");
        i++;
        break;
    }
  }

  writer.write("  ;;-- exit --\n");
  writer.write("addr_" + i + ":\n");
  writer.write("  mov rax, 60\n");
  writer.write("  mov rdi, 0\n");
  writer.write("  syscall\n");

  writer.write("segment .bss\n");
  writer.write("mem resb " + runOpts.memCap + "\n");

  writer.end();
  console.log("CMD: nasm -felf64 " + runOpts.outPrefix + ".asm");
  const nasm = Bun.spawn({
    cmd: ["nasm", "-felf64", runOpts.outPrefix + ".asm"],
  });
  await nasm.exited;

  console.log(
    "CMD: ld -o " + runOpts.outPrefix + " " + runOpts.outPrefix + ".o",
  );
  const link = Bun.spawn({
    cmd: ["ld", "-o", runOpts.outPrefix, runOpts.outPrefix + ".o"],
  });

  await link.exited;

  console.log("CMD:" + runOpts.outPrefix);
  const prog = Bun.spawn({
    cmd: [runOpts.outPrefix],
  });
  const res = await new Response(prog.stdout).text();
  const trimmed = res.trim();
  if (trimmed != "") {
    console.log(trimmed);
  }
};

const crossRef = (program: Instruction[]) => {
  let stack = [];
  let start_location: number | undefined;

  for (const [i, { op, ...rest }] of program.entries()) {
    assert(
      Op.Count == 14,
      "Exhastive handling of operations is expected in crossref",
    );
    switch (op) {
      case Op.If:
        stack.push(i);
        break;
      case Op.Else:
        let if_location = stack.pop();
        if (if_location == undefined || program[if_location].op != Op.If) {
          console.error(
            `ERROR: Unmatched else at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        program[if_location].jump = i + 1;
        stack.push(i);
        break;
      case Op.While:
        stack.push(i);
        break;
      case Op.Do:
        start_location = stack.pop();
        if (
          start_location == undefined ||
          program[start_location].op != Op.While
        ) {
          console.error(
            `ERROR: Unmatched do at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        program[i].jump = start_location;
        stack.push(i);
        break;
      case Op.End:
        start_location = stack.pop();
        if (start_location == undefined) {
          console.error(
            `ERROR: Unmatched end at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        if (
          program[start_location].op == Op.If ||
          program[start_location].op == Op.Else
        ) {
          program[start_location].jump = i;
          program[i].jump = i + 1;
        } else if (program[start_location].op == Op.Do) {
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

const parseTokenAsIntruction = (
  token: Token,
): Instruction => {
  assert(
    Op.Count == 14,
    "Exhastive handling of operations is expected in parsing tokens",
  );

  const { text, loc } = token;

  if (text in strToOp) {
    return { op: strToOp[text], loc };
  }

  if (text.match(/^[0-9]+$/)) {
    return { op: Op.Push, loc, value: parseInt(text) };
  } else {
    console.error(
      `ERROR: Unknown token ${text} at ${loc.path}:${loc.row}:${loc.col}`,
    );
    process.exit(1);
  }
};

const collectCols = (
  line: string,
  col: number,
  predicate: (c: string) => RegExpMatchArray | boolean | null,
) => {
  while (col < line.length && predicate(line[col])) {
    col++;
  }
  return col;
};

const lexLine = (path: string, row: number, line: string) => {
  let col = 0;
  let start = 0;
  let res: Token[] = [];
  while (col < line.length) {
    col = collectCols(line, col, (c) => c.match(/\s/));
    if (col >= line.length) break;
    start = col;
    col = collectCols(line, col, (c) => !c.match(/\s/));
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

const lexFile = async (path: string) => {
  const file = Bun.file(path);
  const text = await file.text();
  const lines = text.split("\n").map((line) => line.split("//")[0]);
  return lines.map((
    line,
    row,
  ) => lexLine(path, row, line)).flat();
};

const loadProgramFromFile = async (path: string) => {
  const lexed = await lexFile(path);
  const program = lexed.map(parseTokenAsIntruction);
  return crossRef(program);
};

const usage = () => {
  console.log("Usage: bun run <SUBCOMMAND> [ARGS]");
  console.log("SUBCOMMANDS:");
  console.log("   sim <file>      Simulate the program");
  console.log("   com <file> [out]      Compile the program");
};

interface RunOptions {
  outPrefix: string;
  memCap: number;
}

const main = async (runOpts: RunOptions) => {
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
    const program = await loadProgramFromFile(file);
    simulate(program, runOpts);
  } else if (subcmd == "com") {
    const program = await loadProgramFromFile(file);
    await compile(program, runOpts);
  } else {
    usage();
    console.error(`Unknown subcommand: ${subcmd}`);
    process.exit(1);
  }
};

await main(
  {
    outPrefix: "./build/out",
    memCap: 64 * 1024, // 64KB
  },
);
