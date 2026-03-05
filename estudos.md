## Decorators

Sem o uso do @, o nest.js ignora ou simplesmente vê como uma classe ou uma função normal, mas quando usamos o @, ele entende e passa a enxergar aquilo. É como um rótulo, que diz a ele o que aquele método ou função faz e ele passa a reconhecê-lo. 

## Sobre o export usado nos arquivos 

```javascript
export class UsuariosController 
```

export = significa que além de criarmos a classe UsuariosController, ela poderá ser acessada por outros arquivos. 

## constructor

```typescript
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}
  ```