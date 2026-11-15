# THIRD_PARTY_LICENSES — DINO DASH 3D

Este documento lista as bibliotecas Open Source utilizadas pelo **DINO DASH 3D** para transparência jurídica e cumprimento integral das obrigações de atribuição (conforme `package.json` e `package-lock.json` auditados em `AUDIT_BASELINE.md`).

> **Nota sobre compatibilidade de licenças:** Das **104 dependências** (diretas e transitivas) inventariadas em `package-lock.json`, **94 são MIT**, **8 são ISC**, **1 é BSD-3-Clause** e **1 é 0BSD**. Nenhuma biblioteca copyleft (`GPL`, `AGPL`, `LGPL`, `SSPL`) está presente no grafo de dependências.

---

## 1. Dependências Diretas

| Pacote | Versão (`package-lock.json`) | Escopo | Licença | Titular de Copyright |
| --- | --- | --- | --- | --- |
| `three` | `0.170.0` | Runtime (Renderização 3D WebGL) | MIT | Copyright © 2010-2024 three.js authors |
| `@supabase/supabase-js` | `2.119.0` | Runtime (Auth, DB, Realtime) | MIT | Copyright (c) 2020 Supabase |
| `qrcode` | `1.5.4` | Runtime (QR Code LAN) | MIT | Copyright (c) 2012 Ryan Day |
| `ws` | `8.23.0` | Servidor LAN (`server/lan-host.js`) | MIT | Copyright (c) 2011 Einar Otto Stangvik; 2013 Arnout Kazemier; 2016 Luigi Pinca |
| `vite` | `6.4.6` | Build / Dev | MIT | Copyright (c) 2019-present, VoidZero Inc. and Vite contributors |

---

## 2. Dependências Transitivas Não-MIT Auditadas (`package-lock.json`)

Todas as demais dependências transitivas utilizam licença **MIT**, exceto os 10 pacotes permissivos abaixo:

| Pacote | Versão | Licença |
| --- | --- | --- |
| `cliui` | `6.0.0` | ISC |
| `get-caller-file` | `2.0.5` | ISC |
| `picocolors` | `1.1.1` | ISC |
| `require-main-filename` | `2.0.0` | ISC |
| `set-blocking` | `2.0.0` | ISC |
| `which-module` | `2.0.1` | ISC |
| `y18n` | `4.0.3` | ISC |
| `yargs-parser` | `18.1.3` | ISC |
| `source-map-js` | `1.2.2` | BSD-3-Clause |
| `tslib` | `2.8.1` | 0BSD |

---

## 3. Textos Integrais das Licenças Permissivas Utilizadas

### 3.1 The MIT License (MIT)

```text
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 3.2 ISC License (ISC)

```text
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### 3.3 BSD-3-Clause License (`source-map-js`)

```text
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED.
```

### 3.4 Zero-Clause BSD (`tslib` — 0BSD)

```text
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS.
```
