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
  // Abstraction
  ProcDef,
  ProcCall,
  ProcBegin,
  ProcRet,
  Identifier,
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
  // Abstraction
  "proc": Op.ProcDef,
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

  let procStack: number[] = [];

  let stdoutUsed = false;
  let stderrUsed = false;

  let i = 0;
  while (i < program.length) {
    assert(
      Op.Count == 33,
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
      // Abstraction
      case Op.ProcDef:
        i = rest.jump!;
        break;
      case Op.ProcCall:
        if (procStack.length > runOpts.procStackCap) {
          console.error(
            `ERROR: Proc stack overflow at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        procStack.push(i + 1);
        i = rest.jump!;
        break;
      case Op.ProcBegin:
        i++; // Ignored in simulation
        break;
      case Op.ProcRet:
        i = procStack.pop()!;
        break;
      case Op.Identifier:
        console.error(
          `ERROR: Unreachable, all identifiers should be resolved before runtime - ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
        );
        process.exit(1);
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

  let reserved: Record<string, [string, number, number]> = {};
  let uniqueReserved = 0;

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
  writer.write("  ;;-- init --\n");
  writer.write("  mov rax, process_stack_end\n");
  writer.write("  mov [process_stack_rsp], rax\n");

  const end = program.length;
  let i = 0;
  while (i < end) {
    const { op, ...rest } = program[i];
    assert(
      Op.Count == 33,
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
        writer.write("  ;;-- push str --\n");
        if (!(rest.value in reserved)) {
          const bts = new TextEncoder().encode(rest.value);
          const hex = Array.from(bts, (byte) => {
            return ("0" + (byte & 0xFF).toString(16)).slice(-2);
          }).map((b) => "0x" + b).join(",");
          reserved[rest.value] = [hex, uniqueReserved, bts.length];
          uniqueReserved++;
        }
        const [_, idx, btsLen] = reserved[rest.value];
        writer.write("  mov rax, " + btsLen + "\n");
        writer.write("  push rax\n");
        writer.write("  push comptime_" + idx + "\n");
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
      // Abstraction
      case Op.ProcDef:
        writer.write("  ;;-- proc " + program[i + 1].value + " --\n");
        writer.write("  jmp addr_" + rest.jump + "\n");
        i++;
        break;
      case Op.ProcCall:
        writer.write("  ;;-- call " + rest.value + " --\n");
        writer.write("  mov rax, rsp\n");
        writer.write("  mov rsp, [process_stack_rsp]\n");
        writer.write("  call addr_" + rest.jump + "\n");
        writer.write("  mov [process_stack_rsp], rsp\n");
        writer.write("  mov rsp, rax\n");
        i++;
        break;
      case Op.ProcBegin:
        writer.write("  ;;-- proc begin --\n");
        writer.write("  mov [process_stack_rsp], rsp\n");
        writer.write("  mov rsp, rax\n");
        i++;
        break;
      case Op.ProcRet:
        writer.write("  ;;-- proc ret --\n");
        writer.write("  mov rax, rsp\n");
        writer.write("  mov rsp, [process_stack_rsp]\n");
        writer.write("  ret\n");
        i++;
        break;
      case Op.Identifier:
        console.error(
          `ERROR: Unreachable, all identifiers should be resolved before runtime - ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
        );
        process.exit(1);

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

  writer.write("segment .data\n");
  for (const [_str, [hex, idx, _]] of Object.entries(reserved)) {
    writer.write("comptime_" + idx + ": db " + hex + "\n");
  }

  writer.write("segment .bss\n");
  writer.write("process_stack_rsp resq 1\n");
  writer.write("process_stack resb " + runOpts.procStackCap + "\n");
  writer.write("process_stack_end:\n");
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
  // The stack of indexes of any operations that start a block
  let stack = [];
  // The index of the operation that starts the block
  let start_location: number | undefined;

  // The map of identifiers filled after encoutering their definition
  // The value is array of [kind, jump] where kind is the operation that defines the identifier
  // and jump is the index of the operation that defines the identifier
  let knownIdentifiers: Record<string, [Op, number]> = {};

  // The list of identifiers seen in the program
  let seenIdentifiers = [];

  // Flag to check if we are in a proc definition to prevent nested proc definitions
  let procDefinition = false;

  for (const [i, { op, ...rest }] of program.entries()) {
    assert(
      Op.Count == 33,
      "Exhastive handling of operations is expected in crossref",
    );
    switch (op) {
      case Op.If:
        // Push the index of the if instruction to the stack to be used with the next else or end instruction
        stack.push(i);
        break;
      case Op.Else:
        // Pop the index of the if instruction from the stack
        let if_location = stack.pop();
        // Check if the instruction is of kind if, otherwise it is an unmatched else, so we exit
        if (if_location == undefined || program[if_location].op != Op.If) {
          console.error(
            `ERROR: Unmatched else at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        // Set the jump of corresponding if instruction to the index after the else instruction
        program[if_location].jump = i + 1;
        // Since now else needs closing, we push the index of the else instruction to the stack to be used with the next end instruction
        stack.push(i);
        break;
      case Op.While:
        // Push the index of the while instruction to the stack to be used with the next do and end instruction
        stack.push(i);
        break;
      case Op.Do:
        // Pop the index of the while instruction from the stack
        start_location = stack.pop();
        // Check if the instruction is of kind while, otherwise it is an unmatched do, so we exit
        if (
          start_location == undefined ||
          program[start_location].op != Op.While
        ) {
          console.error(
            `ERROR: Unmatched do at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        // Set the jump of current do instruction to the index of the while instruction
        // This is to store it for the end instruction, since do does not jump to while
        // Do jumps either to the next instruction or to the instruction after the end
        program[i].jump = start_location;
        stack.push(i);
        break;
      case Op.End:
        // Pop the index of the start of the block from the stack
        start_location = stack.pop();
        // If we are not in a block, then it is an unmatched end, so we exit
        if (start_location == undefined) {
          console.error(
            `ERROR: Unmatched end at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        const corrOp = program[start_location].op;
        if (corrOp == Op.If || corrOp == Op.Else) {
          // If the corresponding operation is If or Else, then we set their jump to index of current End
          // This jump is used when If condition is false in case of If-End block (without Else)
          // Or when the If condition is true in case of If-Else-End block, thus skipping the Else block
          program[start_location].jump = i;
          // We also set the jump of the current end to the next instruction
          // This is used immediately as end always jumps
          program[i].jump = i + 1;
        } else if (corrOp == Op.Do) {
          // If the corresponding operation is Do, then we need to jump to the paired While instruction
          // We obtain the index of While stored within the Do instruction and set it
          // This is used immediately as End always jumps
          program[i].jump = program[start_location].jump;
          // But the Do instruction needs to exit the loop if condition is false
          // So now we set the jump of corresponding Do instruction to the next index after current End
          program[start_location].jump = i + 1;
        } else if (corrOp == Op.ProcDef) {
          // If the corresponding operation is ProcDef, we first set the flag to signify definition is over
          procDefinition = false;
          // Then we set the jump of the ProcDef instruction to the next index after current End
          // This means when we encounter ProcDef, we should just directly skip to after the End.
          program[start_location].jump = i + 1;
          // However when the ProcCall procedure is used, we need to change the behavior of End
          // So we simply replace the current End instruction with ProcRet
          program[i].op = Op.ProcRet;
        } else {
          console.error(
            `ERROR: Unreachable end started with ${
              program[start_location].op
            } at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        break;
      case Op.ProcDef:
        // Check that the next instruction is an identifier
        if (program[i + 1].op != Op.Identifier) {
          console.error(
            `ERROR: Proc name must be identifier at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        const procName = program[i + 1].value;
        // Check that the identifier is not already defined for any abstraction
        if (knownIdentifiers.hasOwnProperty(procName)) {
          console.error(
            `ERROR: Duplicate identifier ${
              program[i + 1].value
            } at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
        }
        // Push the index of the identifier to the stack to be used with the next end instruction
        stack.push(i);
        // Check if we are already in a proc definition, we don't support nested procs
        if (procDefinition) {
          console.error(
            `ERROR: Nested proc definition at ${rest.loc.path}:${rest.loc.row}:${rest.loc.col}`,
          );
          process.exit(1);
        }
        // Since we are not in nested proc definition, we can set the flag
        procDefinition = true;
        // Add the identifier to the known identifiers map with kind ProcDef and the index of the ProcBegin
        knownIdentifiers[procName] = [Op.ProcDef, i + 1];
        // Change the next operation from identifier to ProcBegin
        program[i + 1].op = Op.ProcBegin;
        break;
      case Op.Identifier:
        // Push the raw text, index and location of the identifier to the seen list
        seenIdentifiers.push([rest.value, i, rest.loc]);
        break;
    }

    // Check for undefined identifiers
    for (const [name, i, loc] of seenIdentifiers) {
      if (!knownIdentifiers.hasOwnProperty(name)) {
        console.error(
          `ERROR: Undefined identifier ${name} at ${loc.path}:${loc.row}:${loc.col}`,
        );
        process.exit(1);
      } else {
        // Since we know the identifier, we can replace it with the correct operation
        let [kind, jump] = knownIdentifiers[name];
        switch (kind) {
          case Op.ProcDef:
            // Since we know the identifier from ProcDef, we replace this instruction with ProcCall
            program[i].op = Op.ProcCall;
            // We also set the jump to the index of the ProcBegin
            program[i].jump = jump;
            break;
        }
      }
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

const escapeString = (str: string): string => {
  const escapeMap: Record<string, string> = {
    n: "\n",
    t: "\t",
    "\\": "\\",
    '"': '"',
  };

  let out = "";
  let i = 0;

  while (i < str.length) {
    if (str[i] === "\\") {
      const escapeChar = str[i + 1];

      if (escapeMap.hasOwnProperty(escapeChar)) {
        out += escapeMap[escapeChar];
        i += 2;
      } else {
        console.error(
          `ERROR: Unknown escape sequence \\${escapeChar} in string ${str}`,
        );
        process.exit(1);
      }
    } else {
      out += str[i];
      i++;
    }
  }

  return out;
};

const parseTokenAsIntruction = (
  token: Token,
): Instruction => {
  assert(
    Op.Count == 33,
    "Exhastive handling of operations is expected in parsing tokens",
  );

  const { text, loc } = token;

  if (text[0] == "#") {
    return { op: Op.Comment, loc, value: text };
  }

  if (text[0] == '"') {
    return {
      op: Op.PushStr,
      loc,
      value: escapeString(text.substring(1, text.length - 1)),
    };
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
        break;
    }
  }
  return { op: Op.Identifier, loc, value: text };
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
  // We first read the file into a string
  const file = Bun.file(path);
  const text = await file.text();
  // We begin lexing with a cursor at the start of the file
  let row = 0;
  let col = 0;
  let cur = 0;
  // We initiate a list for collecting tokens
  let tokens: Token[] = [];
  // We continue lexing until we reach the end of the file
  while (cur < text.length) {
    // We eliminate any starting whitespace
    [cur, row, col] = collectChars(
      text,
      cur,
      row,
      col,
      (buf, i) => buf[i].match(/\s/),
    );
    // If we have reached the end of the file, we break
    if (cur >= text.length) break;
    // We are at a non-whitespace character, so we store the start of the token
    let start = cur;
    let srow = row;
    let scol = col;
    // Depending on the character, we change the lexing behavior
    switch (text[start]) {
      case '"':
        // If the current character is a double quote, we are lexing a string
        // We increment the cursor to next character as lexing a string requires 1lookback
        [cur, row, col] = incrementCursor(text, cur, row, col);
        [cur, row, col] = collectChars(
          text,
          cur,
          row,
          col,
          (buf, i) => (buf[i - 1] !== "\\" && buf[i] === '"') ? false : true,
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
  // We first lex the file into tokens
  const lexed = await lexFile(path);
  // Then we parse the tokens into instructions
  const program = lexed.map(parseTokenAsIntruction);
  // Then we cross reference the instructions to resolve identifiers and blocks
  return crossRef(program);
};

const usage = () => {
  console.log("Usage: bun run <SUBCOMMAND> [ARGS]");
  console.log("SUBCOMMANDS:");
  console.log("   scn <file>      Print the program representation");
  console.log("   sim <file>      Simulate the program");
  console.log("   com <file> [out]      Compile the program");
  console.log("   mix <file> [out]      Simulate and compile the program");
};

interface RunOptions {
  outPrefix: string; // We generate .asm, .o and executable with this prefix when compiling
  reservedCap: number; // The static memory reserved for compile time known values
  memCap: number; // The dynamic memory reserved for runtime
  procStackCap: number; // The procdure inception limit
  execute?: boolean; // Whether to execute the compiled program
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
    case "scn":
      for (const [i, instr] of program.entries()) {
        console.log(i + ": " + JSON.stringify(instr));
      }
      break;
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
    procStackCap: 1024,
    execute: false,
  },
);
