import { assert } from "console";

enum Op {
  // Stack manipulation
  PushInt = 0,
  PushStr,
  Drop,
  Dup,
  NDup,
  Swap,
  Over,
  Rot,
  // Arithmetic
  Plus,
  Minus,
  // Logic
  Equal,
  Gt,
  Lt,
  // Boolean
  Shr,
  Shl,
  Bor,
  Band,
  // Debug
  Dump,
  Comment,
  // Control flow
  If,
  Else,
  While,
  Do,
  End,
  // Memory
  Mem,
  Load,
  Store,
  // Syscall
  Syscall,
  Count,
}

const strToOp: Record<string, Op> = {
  // Stack manipulation
  "drop": Op.Drop,
  "dup": Op.Dup,
  "swap": Op.Swap,
  "over": Op.Over,
  "rot": Op.Rot,
  // Arithmetic
  "+": Op.Plus,
  "-": Op.Minus,
  // Logic
  "=": Op.Equal,
  ">": Op.Gt,
  "<": Op.Lt,
  // Boolean
  "shr": Op.Shr,
  "shl": Op.Shl,
  "bor": Op.Bor,
  "band": Op.Band,
  // Debug
  "dump": Op.Dump,
  // Control flow
  "if": Op.If,
  "else": Op.Else,
  "while": Op.While,
  "do": Op.Do,
  "end": Op.End,
  // Memory
  "mem": Op.Mem,
  ",": Op.Load,
  ".": Op.Store,
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

const sysCall = async (num: number, args: any[], mem: Uint8Array) => {
  switch (num) {
    case 1: // write
      const fd = args[0];
      const buf = args[1];
      const count = args[2];
      const str = new TextDecoder().decode(mem.slice(buf, buf + count));
      switch (fd) {
        case 1:
          await Bun.write(Bun.stdout, str);
          break;
        case 2:
          await Bun.write(Bun.stderr, str);
          break;
        default:
          console.error(
            "ERROR: Unknown file descriptor " + fd +
              " only stdout and stderr are supported in simulation mode",
          );
          process.exit(1);
      }
      break;
    case 60: // exit
      process.exit(args[0]);
    default:
      console.error("ERROR: Unknown syscall " + num);
  }
};

const simulate = async (program: Instruction[], runOpts: RunOptions) => {
  let stack: any[] = [];
  let mem: Uint8Array = new Uint8Array(runOpts.reservedCap + runOpts.memCap);
  let arg0: any;
  let arg1: any;

  let syscallNum: number;
  let argsArray: any[] = [];

  let reservedSoFar = 0;
  let reservedAddr: Record<string, [number, number]> = {};

  let stdoutUsed = false;
  let stderrUsed = false;

  let i = 0;
  while (i < program.length) {
    assert(
      Op.Count == 28,
      "Exhastive handling of operations is expected in simulate",
    );
    const { op, ...rest } = program[i];
    switch (op) {
      // Stack manipulation
      case Op.PushInt:
        stack.push(rest.value);
        i++;
        break;
      case Op.PushStr:
        if (!(rest.value in reservedAddr)) {
          const bts = new TextEncoder().encode(rest.value);
          if (reservedSoFar + bts.length < runOpts.reservedCap) {
            reservedAddr[rest.value] = [reservedSoFar, bts.length];
            mem.set(bts, reservedSoFar);
            reservedSoFar += bts.length;
          } else {
            console.error(
              `ERROR: Insufficient reserved memory at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
            );
            process.exit(1);
          }
        }
        stack.push(reservedAddr[rest.value][1]);
        stack.push(reservedAddr[rest.value][0]);
        i++;
        break;
      case Op.Drop:
        stack.pop();
        i++;
        break;
      case Op.Dup:
        arg0 = stack.pop();
        stack.push(arg0);
        stack.push(arg0);
        i++;
        break;
      case Op.NDup:
        for (let j = 0; j < rest.value; j++) {
          stack.push(stack[stack.length - rest.value]);
        }
        i++;
        break;
      case Op.Swap:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg0);
        stack.push(arg1);
        i++;
        break;
      case Op.Over:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1);
        stack.push(arg0);
        stack.push(arg1);
        i++;
        break;
      case Op.Rot:
        argsArray = [stack.pop(), stack.pop(), stack.pop()];
        stack.push(argsArray[1]);
        stack.push(argsArray[0]);
        stack.push(argsArray[2]);
        i++;
        break;
      // Arithmetic
      case Op.Plus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 + arg0);
        i++;
        break;
      case Op.Minus:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 - arg0);
        i++;
        break;
      // Logic
      case Op.Equal:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push((arg1 == arg0) ? 1 : 0);
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
      // Boolean
      case Op.Shr:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 >> arg0);
        i++;
        break;
      case Op.Shl:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 << arg0);
        i++;
        break;
      case Op.Bor:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 | arg0);
        i++;
        break;
      case Op.Band:
        arg0 = stack.pop();
        arg1 = stack.pop();
        stack.push(arg1 & arg0);
        i++;
        break;
      // Debug
      case Op.Dump:
        arg0 = stack.pop();
        console.log(arg0);
        i++;
        break;
      case Op.Comment:
        i++;
        break;
      // Control flow
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
      // Memory
      case Op.Mem:
        stack.push(runOpts.reservedCap);
        i++;
        break;
      case Op.Load:
        arg0 = stack.pop();
        stack.push(mem[arg0]);
        i++;
        break;
      case Op.Store:
        arg0 = stack.pop();
        arg1 = stack.pop();
        mem[arg1] = arg0 & 0xFF;
        i++;
        break;
      // Syscall
      case Op.Syscall:
        syscallNum = stack.pop();
        argsArray = [];
        for (let j = 0; j < rest.value; j++) {
          argsArray.push(stack.pop());
        }
        sysCall(syscallNum, argsArray, mem);
        if (syscallNum == 1 && argsArray[0] == 1) {
          stdoutUsed = true;
        }
        if (syscallNum == 1 && argsArray[0] == 2) {
          stderrUsed = true;
        }
        i++;
        break;
    }
  }

  if (stdoutUsed) {
    await Bun.write(Bun.stdout, "\n");
  }
  if (stderrUsed) {
    await Bun.write(Bun.stderr, "\n");
  }

  console.log("Reserved partition utilization: " + reservedSoFar);
};

const compile = async (
  program: Instruction[],
  runOpts: RunOptions,
) => {
  const syscallLocs = ["rdi", "rsi", "rdx", "r10", "r8", "r9"];
  const genLocs = ["rax", "rbx", "rcx", "rdx", "rdi", "rsi"];

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
      Op.Count == 28,
      "Exhastive handling of operations is expected in compile",
    );
    writer.write("addr_" + i + ":\n");
    switch (op) {
      // Stack manipulation
      case Op.PushInt:
        writer.write("  ;;-- push " + rest.value + " --\n");
        writer.write("  push " + rest.value + "\n");
        i++;
        break;
      case Op.PushStr:
        writer.write("  ;;-- push " + rest.value + " --\n");
        i++;
        break;
      case Op.Drop:
        writer.write("  ;;-- drop --\n");
        writer.write("  pop rax\n");
        i++;
        break;
      case Op.Dup:
        writer.write("  ;;-- dup --\n");
        writer.write("  pop rax\n");
        writer.write("  push rax\n");
        writer.write("  push rax\n");
        i++;
        break;
      case Op.NDup:
        writer.write("  ;;-- ndup --\n");
        for (let j = 0; j < rest.value; j++) {
          writer.write("  pop " + genLocs[j] + "\n");
        }
        for (let repeat = 0; repeat < 2; repeat++) {
          for (let j = rest.value - 1; j >= 0; j--) {
            writer.write("  push " + genLocs[j] + "\n");
          }
        }
        i++;
        break;
      case Op.Swap:
        writer.write("  ;;-- swap --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  push rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Over:
        writer.write("  ;;-- over --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  push rbx\n");
        writer.write("  push rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Rot:
        writer.write("  ;;-- rot --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  pop rcx\n");
        writer.write("  push rbx\n");
        writer.write("  push rax\n");
        writer.write("  push rcx\n");
        i++;
        break;
      // Arithmetic
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
      // Logic
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
      // Boolean
      case Op.Shr:
        writer.write("  ;;-- shr --\n");
        writer.write("  pop rcx\n");
        writer.write("  pop rbx\n");
        writer.write("  shr rbx, cl\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Shl:
        writer.write("  ;;-- shl --\n");
        writer.write("  pop rcx\n");
        writer.write("  pop rbx\n");
        writer.write("  shl rbx, cl\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Bor:
        writer.write("  ;;-- bor --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  or rbx, rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Band:
        writer.write("  ;;-- band --\n");
        writer.write("  pop rax\n");
        writer.write("  pop rbx\n");
        writer.write("  and rbx, rax\n");
        writer.write("  push rbx\n");
        i++;
        break;
      // Control flow
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
      // Debug
      case Op.Dump:
        writer.write("  ;;-- dump --\n");
        writer.write("  pop rdi\n");
        writer.write("  call dump\n");
        i++;
        break;
      case Op.Comment:
        writer.write("  ;;-- " + rest.value + " --\n");
        i++;
        break;
      // Memory
      case Op.Mem:
        writer.write("  ;;-- mem --\n");
        writer.write("  push mem\n");
        i++;
        break;
      case Op.Load:
        writer.write("  ;;-- load --\n");
        writer.write("  pop rax\n");
        writer.write("  xor rbx, rbx\n");
        writer.write("  mov bl, [rax]\n");
        writer.write("  push rbx\n");
        i++;
        break;
      case Op.Store:
        writer.write("  ;;-- store --\n");
        writer.write("  pop rbx\n");
        writer.write("  pop rax\n");
        writer.write("  mov [rax], bl\n");
        i++;
        break;
      // Syscall
      case Op.Syscall:
        writer.write("  ;;-- syscall " + rest.value + " --\n");
        writer.write("  pop rax\n");
        for (let j = 0; j < rest.value; j++) {
          writer.write("  pop " + syscallLocs[j] + "\n");
        }
        writer.write("  syscall\n");
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

  if (runOpts.execute) {
    console.log("CMD:" + runOpts.outPrefix);
    const prog = Bun.spawn({
      cmd: [runOpts.outPrefix],
    });
    const res = await new Response(prog.stdout).text();
    const trimmed = res.trim();
    if (trimmed != "") {
      console.log(trimmed);
    }
  }
};

const crossRef = (program: Instruction[]) => {
  let stack = [];
  let start_location: number | undefined;

  for (const [i, { op, ...rest }] of program.entries()) {
    assert(
      Op.Count == 28,
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
    Op.Count == 28,
    "Exhastive handling of operations is expected in parsing tokens",
  );

  const { text, loc } = token;

  if (text[0] == "#") {
    return { op: Op.Comment, loc, value: text };
  }

  if (text[0] == '"') {
    return { op: Op.PushStr, loc, value: text.substring(1, text.length - 1) };
  }

  if (text.match(/^[0-9]+$/)) {
    return { op: Op.PushInt, loc, value: parseInt(text) };
  }

  if (text in strToOp) {
    return { op: strToOp[text], loc };
  }

  const variadicMatch = text.match(/^\(([0-6])\)([a-z]+)$/);
  if (variadicMatch) {
    const value = parseInt(variadicMatch[1]);
    switch (variadicMatch[2]) {
      case "syscall":
        return { op: Op.Syscall, loc, value };
      case "dup":
        if (value < 2) {
          console.error(
            `ERROR: Invalid argument to dup at ${loc.path}:${loc.row}:${loc.col}`,
          );
          process.exit(1);
        }
        return { op: Op.NDup, loc, value };
      default:
        console.error(
          `ERROR: Unknown token ${text} at ${loc.path}:${loc.row}:${loc.col}`,
        );
    }
  }

  console.error(
    `ERROR: Unknown token ${text} at ${loc.path}:${loc.row}:${loc.col}`,
  );
  process.exit(1);
};

const incrementCursor = (
  text: string,
  cur: number,
  row: number,
  col: number,
) => {
  if (text[cur] == "\n") {
    row++;
    col = 0;
  } else {
    col++;
  }
  cur++;
  return [cur, row, col];
};

const collectChars = (
  text: string,
  cur: number,
  row: number,
  col: number,
  predicate: (buf: string, index: number) => RegExpMatchArray | boolean | null,
) => {
  while (cur < text.length && predicate(text, cur)) {
    [cur, row, col] = incrementCursor(text, cur, row, col);
  }
  return [cur, row, col];
};

const lexFile = async (path: string) => {
  const file = Bun.file(path);
  const text = await file.text();
  let row = 0;
  let col = 0;
  let cur = 0;
  let tokens: Token[] = [];
  while (cur < text.length) {
    [cur, row, col] = collectChars(
      text,
      cur,
      row,
      col,
      (buf, i) => buf[i].match(/\s/),
    );
    if (cur >= text.length) break;
    let start = cur;
    let srow = row;
    let scol = col;
    switch (text[start]) {
      case '"':
        [cur, row, col] = incrementCursor(text, cur, row, col);
        [cur, row, col] = collectChars(
          text,
          cur,
          row,
          col,
          (buf, i) =>
            (i > 0 && buf[i - 1] !== "\\" && buf[i] === '"') ? false : true,
        );
        [cur, row, col] = incrementCursor(text, cur, row, col);
        break;
      case "#":
        [cur, row, col] = collectChars(
          text,
          cur,
          row,
          col,
          (buf, c) => !buf[c].match(/\n/),
        );
        break;
      default:
        [cur, row, col] = collectChars(
          text,
          cur,
          row,
          col,
          (buf, i) => !buf[i].match(/\s/),
        );
        break;
    }
    tokens.push({
      text: text.substring(start, cur),
      loc: { path, row: srow, col: scol },
    });
  }
  return tokens;
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
  reservedCap: number;
  memCap: number;
  execute?: boolean;
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
  const program = await loadProgramFromFile(file);
  switch (subcmd) {
    case "sim":
      await simulate(program, runOpts);
      break;
    case "com":
      await compile(program, runOpts);
      break;
    case "mix":
      console.log("sim");
      await simulate(program, runOpts);
      console.log("com");
      await compile(program, runOpts);
      const prog = Bun.spawn({
        cmd: [runOpts.outPrefix],
      });
      const res = await new Response(prog.stdout).text();
      const trimmed = res.trim();
      if (trimmed != "") {
        console.log(trimmed);
      }
      break;
    default:
      usage();
      console.error(`Unknown subcommand: ${subcmd}`);
      process.exit(1);
  }
};

await main(
  {
    outPrefix: "./build/out",
    reservedCap: 64 * 1024, // 64KB
    memCap: 64 * 1024, // 64KB
    execute: false,
  },
);
