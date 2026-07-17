import { StaticImagesService } from "./staticImagesService";
class UserAvatarService extends StaticImagesService {
  constructor() {
    super({
      savePath: "avatars",
    });
  }
}

export { UserAvatarService };
