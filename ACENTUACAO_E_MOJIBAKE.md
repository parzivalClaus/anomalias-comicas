# Acentuação e mojibake

Sempre que alterar textos exibidos no jogo, revisar acentuação e sinais de mojibake antes de commitar.

## Checklist rápido

- Preferir textos em UTF-8 real, com acentos corretos: `não`, `você`, `ação`, `produção`, `cósmicas`, `possível`, `disponível`.
- Desconfiar de sequências como `Ã`, `Â`, `â`, `NÃ`, `vocÃ`, `aÃ`, `possÃ`, `produÃ`.
- Conferir mensagens novas em componentes, modais, toasts, labels, `aria-label`, manifest PWA e textos da Dex.
- Se o terminal mostrar algo estranho, validar com Node lendo o arquivo em UTF-8 antes de assumir que o arquivo está quebrado.

## Comandos úteis

```bash
rg -n "Ã|Â|â|NÃ|vocÃ|aÃ|possÃ|produÃ" src public
rg -n "\b(nao|Nao|voce|Voce|acao|acoes|producao|disponivel|possivel|sera|esta|critica|colonia|cosmicas)\b" src public
```

O primeiro comando procura mojibake provável. O segundo ajuda a encontrar português sem acento que talvez precise de revisão.
