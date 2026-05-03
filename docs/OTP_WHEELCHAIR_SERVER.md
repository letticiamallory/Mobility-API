# OTP — roteamento com foco em cadeira de rodas (Fase 2)

A API Nest já envia `wheelchair=true` no planejador quando `otpWheelchairRouting` indica (ver `OTP_WHEELCHAIR_ROUTING` e perfil do usuário em `docs/ACCESSIBILITY_POLICY.md`). O **servidor OpenTripPlanner** precisa estar construído e configurado para respeitar isso.

## OTP 1.x (`/otp/routers/default/plan`)

O parâmetro de query `wheelchair=true` (já usado por `OtpService`) ativa itinerários que consideram acessibilidade, **desde que** o grafo e o `router-config.json` do seu deploy suportem.

## OTP 2.x

Consulte a documentação oficial: [Accessibility – OpenTripPlanner 2](https://docs.opentripplanner.org/en/latest/Accessibility/).

Exemplo mínimo de `router-config.json` para permitir viagens com dados GTFS incompletos (ajuste custos ao seu caso):

```json
{
  "routingDefaults": {
    "wheelchairAccessibility": {
      "enabled": true
    }
  }
}
```

Para penalizar paradas/viagens com acessibilidade desconhecida ou inacessível, use o bloco `wheelchairAccessibility` completo descrito na documentação (custos `unknown` / `inaccessible`, `maxSlope`, `stairsReluctance`, etc.).

## Variáveis no Nest (`mobility-api`)

| Variável | Efeito |
|----------|--------|
| `OTP_URL` | Base do servidor OTP (ex.: `http://localhost:8080`) |
| `OTP_WHEELCHAIR_ROUTING` | `auto` (padrão), `always`, `never`, `alone` / `legacy` |
