# SECURITY.md - Padrões de Segurança e Auditoria de Código

## Visão Geral
Este documento define os padrões de segurança para auditoria e desenvolvimento de código neste projeto.

---

## 1. Princípios de Segurança

### 1.1 Proteção de Dados Sensíveis
- **NUNCA** exponha chaves de API, tokens, senhas ou segredos em código
- Use variáveis de ambiente para dados sensíveis
- Nunca faça commit de arquivos `.env`, `credentials.json`, etc.
- Mantenha senhas hasheadas com bcrypt/argon2

### 1.2 Validação de Entrada
- Valide TODA entrada de usuário antes de processar
- Use schemas de validação (Zod, Joi, Yup)
- Sanitize dados antes de usar em queries SQL
- Implemente rate limiting em APIs públicas

### 1.3 Autenticação e Autorização
- Use JWT com expiração curta
- Implemente refresh tokens seguros
- Aplique princípio do menor privilégio
- Verifique permissões em cada ação

---

## 2. Auditoria de Código

### 2.1 Vulnerabilidades Críticas a Verificar

#### Injection Attacks
```sql
-- EVITE: SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

-- USE: Parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
```

#### XSS (Cross-Site Scripting)
```javascript
// EVITE: InnerHTML sem sanitização
element.innerHTML = userInput;

// USE: TextContent ou sanitização
element.textContent = userInput;
```

#### Command Injection
```javascript
// EVITE: exec com entrada do usuário
exec(`ls ${userPath}`);

// USE: spawn com args separados
spawn('ls', [userPath]);
```

### 2.2 Checklist de Auditoria

- [ ] Todas as APIs têm autenticação
- [ ] Rate limiting implementado
- [ ] Input validation em todos os endpoints
- [ ] Headers de segurança (CORS, CSP, etc.)
- [ ] Logs de auditoria para ações sensíveis
- [ ] HTTPS em todas as comunicações
- [ ] Tokens expiram corretamente
- [ ] Senhas hasheadas com salt
- [ ] Dependencies atualizadas
- [ ] Secrets fora do código

---

## 3. Padrões de Desenvolvimento Seguro

### 3.1 API Security
```typescript
// Sempre use headers de segurança
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "default-src 'self'");
```

### 3.2 Database
- Use connection pooling com limites
- Implemente prepared statements
- Faça backup regularmente
- Use принцип least privilege para usuários DB

### 3.3 Autenticação
```typescript
// JWT com configurações seguras
const token = jwt.sign(
  { userId, role },
  process.env.JWT_SECRET,
  { expiresIn: '15m', algorithm: 'HS256' }
);
```

---

## 4. Logging de Segurança

Ações que DEVEM ser logadas:
- Login bem-sucedido e falho
- Tentativas de acesso não autorizado
- Modificações em dados sensíveis
- Exclusão de dados
- Alterações de permissões

Dados que NUNCA devem ser logados:
- Senhas
- Tokens de acesso
- Dados pessoais sensíveis
- Números de cartão

---

## 5. Resposta a Incidentes

Em caso de suspeita de violação:
1. Imediatamente revogue tokens/sessões afetadas
2. Documente a falha
3. Notifique usuários afetados
4. Corrija a vulnerabilidade
5. Faça auditoria completa

---

## Referências
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- MITRE CWE: https://cwe.mitre.org/
- NIST Security: https://csrc.nist.gov/publications/sp800-53
