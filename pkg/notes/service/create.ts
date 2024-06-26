import { Option, Result } from '@mikuroxina/mini-fn';

import type { AccountID } from '../../accounts/model/account.js';
import type { SnowflakeIDGenerator } from '../../id/mod.js';
import { Note, type NoteID, type NoteVisibility } from '../model/note.js';
import type { NoteRepository } from '../model/repository.js';

export class CreateService {
  async handle(
    content: string,
    contentsWarningComment: string,
    sendTo: Option.Option<AccountID>,
    authorID: AccountID,
    visibility: NoteVisibility,
  ): Promise<Result.Result<Error, Note>> {
    const id = this.idGenerator.generate<Note>();
    if (Result.isErr(id)) {
      return id;
    }
    try {
      const note = Note.new({
        id: id[1] as NoteID,
        content: content,
        contentsWarningComment: contentsWarningComment,
        createdAt: new Date(),
        sendTo: sendTo,
        originalNoteID: Option.none(),
        visibility: visibility,
        authorID: authorID,
      });
      const res = await this.noteRepository.create(note);
      if (Result.isErr(res)) {
        return res;
      }

      return Result.ok(note);
    } catch (e) {
      return Result.err(e as unknown as Error);
    }
  }

  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly idGenerator: SnowflakeIDGenerator,
  ) {}
}
