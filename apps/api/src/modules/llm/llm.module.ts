import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmClient } from "@menu/ai-sdk";
import { OpenAiProvider } from "@menu/ai-sdk";

@Global()
@Module({
  providers: [
    {
      provide: LlmClient,
      useFactory: (config: ConfigService) => {
        const provider = new OpenAiProvider({
          apiKey: config.getOrThrow("OPENAI_API_KEY"),
          baseUrl: config.get("OPENAI_BASE_URL"),
          defaultModel: config.get("OPENAI_MODEL", "gpt-4o"),
        });
        return new LlmClient({
          provider,
          defaultRetries: 2,
          logger: (msg) => console.log(`[AI] ${msg}`),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [LlmClient],
})
export class LlmModule {}
