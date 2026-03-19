import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { PlacesModule } from './places/places.module';
import { RoutesModule } from './routes/routes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432'),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres123',
      database: process.env.DATABASE_NAME ?? 'Mobility',
      autoLoadEntities: true,
      synchronize: false,
    }),
    UsersModule,
    PlacesModule,
    RoutesModule,
    ReviewsModule,
    AuthModule,
  ],
})
export class AppModule {}
