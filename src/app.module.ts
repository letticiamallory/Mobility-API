import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { PlacesModule } from './places/places.module';
import { RoutesModule } from './routes/routes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { LinesModule } from './lines/lines.module';
import { StationsModule } from './stations/stations.module';
import { ElevationModule } from './elevation/elevation.module';
import { WeatherModule } from './weather/weather.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { HereModule } from './here/here.module';
import { FoursquareModule } from './foursquare/foursquare.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UberModule } from './uber/uber.module';

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
    LinesModule,
    StationsModule,
    ElevationModule,
    WeatherModule,
    AccessibilityModule,
    HereModule,
    FoursquareModule,
    NotificationsModule,
    UberModule,
  ],
})
export class AppModule {}
