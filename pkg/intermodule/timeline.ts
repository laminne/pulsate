import { Result } from '@mikuroxina/mini-fn';
import type { Note } from '../notes/model/note.js';

import { prismaClient } from '../adaptors/prisma.js';
import { valkeyClient } from '../adaptors/valkey.js';
import { InMemoryListRepository } from '../timeline/adaptor/repository/dummy.js';
import { InMemoryTimelineCacheRepository } from '../timeline/adaptor/repository/dummyCache.js';
import { PrismaListRepository } from '../timeline/adaptor/repository/prisma.js';
import { ValkeyTimelineCacheRepository } from '../timeline/adaptor/repository/valkeyCache.js';
import { FetchSubscribedListService } from '../timeline/service/fetchSubscribed.js';
import { NoteVisibilityService } from '../timeline/service/noteVisibility.js';
import { PushTimelineService } from '../timeline/service/push.js';
import { accountModule, dummyAccountModuleFacade } from './account.js';

export class TimelineModuleFacade {
  constructor(private readonly pushTimelineService: PushTimelineService) {}

  /*
   * @description Push note to timeline
   * @param note to be pushed
   * */
  async pushNoteToTimeline(note: Note): Promise<Result.Result<Error, void>> {
    const res = await this.pushTimelineService.handle(note);
    if (Result.isErr(res)) {
      return res;
    }

    return Result.ok(undefined);
  }
}

export const timelineModuleFacade = new TimelineModuleFacade(
  new PushTimelineService(
    accountModule,
    new NoteVisibilityService(accountModule),
    // ToDo: Use valkey here
    new ValkeyTimelineCacheRepository(valkeyClient),
    // ToDo: Implement PrismaListRepository
    new FetchSubscribedListService(new PrismaListRepository(prismaClient)),
  ),
);

export const dummyTimelineModuleFacade = (
  timelineCacheRepository: InMemoryTimelineCacheRepository = new InMemoryTimelineCacheRepository(),
) =>
  new TimelineModuleFacade(
    new PushTimelineService(
      dummyAccountModuleFacade,
      new NoteVisibilityService(dummyAccountModuleFacade),
      timelineCacheRepository,
      new FetchSubscribedListService(new InMemoryListRepository()),
    ),
  );
