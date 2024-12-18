import { Ether, Option, Result } from '@mikuroxina/mini-fn';

import type { AccountID } from '../../../accounts/model/account.js';
import type { Medium, MediumID } from '../../../drive/model/medium.js';
import { Bookmark } from '../../model/bookmark.js';
import { NoteNotReactedYetError } from '../../model/errors.js';
import type { Note, NoteID } from '../../model/note.js';
import { Reaction } from '../../model/reaction.js';
import {
  type BookmarkRepository,
  type NoteAttachmentRepository,
  type NoteRepository,
  type ReactionRepository,
  bookmarkRepoSymbol,
  noteAttachmentRepoSymbol,
  noteRepoSymbol,
  reactionRepoSymbol,
} from '../../model/repository.js';

export class InMemoryNoteRepository implements NoteRepository {
  private readonly notes: Map<NoteID, Note>;

  constructor(notes: Note[] = []) {
    this.notes = new Map(notes.map((note) => [note.getID(), note]));
  }

  async create(note: Note): Promise<Result.Result<Error, void>> {
    this.notes.set(note.getID(), note);
    return Result.ok(undefined);
  }

  async deleteByID(id: NoteID): Promise<Result.Result<Error, void>> {
    const target = await this.findByID(id);
    if (Option.isNone(target)) {
      return Result.err(new Error('note not found'));
    }

    this.notes.delete(Option.unwrap(target).getID());
    return Result.ok(undefined);
  }

  findByAuthorID(
    authorID: AccountID,
    limit: number,
  ): Promise<Option.Option<Note[]>> {
    const res = [...this.notes.values()].filter(
      (note) => note.getAuthorID() === authorID,
    );
    if (res.length === 0) {
      return Promise.resolve(Option.none());
    }
    return Promise.resolve(
      Option.some(
        res
          .sort((a, b) => (a.getCreatedAt() < b.getCreatedAt() ? 1 : -1))
          .slice(0, limit),
      ),
    );
  }

  findByID(id: NoteID): Promise<Option.Option<Note>> {
    const res = this.notes.get(id);
    if (!res) {
      return Promise.resolve(Option.none());
    }
    return Promise.resolve(Option.some(res));
  }

  async findManyByIDs(ids: NoteID[]): Promise<Result.Result<Error, Note[]>> {
    const notes = [...new Set(ids)]
      .map((id) => this.notes.get(id))
      .filter((v) => v !== undefined);
    if (notes.length === 0) {
      return Result.err(new Error('note not found'));
    }

    return Result.ok(
      notes.sort((a, b) => (a.getCreatedAt() < b.getCreatedAt() ? 1 : -1)),
    );
  }
}
export const inMemoryNoteRepo = (note: Note[]) =>
  Ether.newEther(noteRepoSymbol, () => new InMemoryNoteRepository(note));

export class InMemoryBookmarkRepository implements BookmarkRepository {
  private readonly bookmarks: Map<[NoteID, AccountID], Bookmark>;

  private equalID(a: [NoteID, AccountID], b: [NoteID, AccountID]): boolean {
    return a[0] === b[0] && a[1] === b[1];
  }

  constructor(bookmarks: Bookmark[] = []) {
    this.bookmarks = new Map(
      bookmarks.map((bookmark) => [
        [bookmark.getNoteID(), bookmark.getAccountID()],
        bookmark,
      ]),
    );
  }

  async create(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Result.Result<Error, void>> {
    const bookmark = Bookmark.new(id);
    this.bookmarks.set([id.noteID, id.accountID], bookmark);
    return Result.ok(undefined);
  }

  async deleteByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Result.Result<Error, void>> {
    const key = Array.from(this.bookmarks.keys()).find((k) =>
      this.equalID(k, [id.noteID, id.accountID]),
    );

    if (!key) {
      return Result.err(new Error('bookmark not found'));
    }

    this.bookmarks.delete(key);
    return Result.ok(undefined);
  }

  async findByID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): Promise<Option.Option<Bookmark>> {
    const bookmark = Array.from(this.bookmarks.entries()).find((v) =>
      this.equalID(v[0], [id.noteID, id.accountID]),
    );
    if (!bookmark) {
      return Promise.resolve(Option.none());
    }
    return Promise.resolve(Option.some(bookmark[1]));
  }

  async findByAccountID(id: AccountID): Promise<Option.Option<Bookmark[]>> {
    const bookmarks = Array.from(this.bookmarks.entries())
      .filter((v) => v[0][1] === id)
      .map((v) => v[1]);

    if (bookmarks.length === 0) {
      return Promise.resolve(Option.none());
    }

    return Promise.resolve(Option.some(bookmarks));
  }
}
export const inMemoryBookmarkRepo = (bookmarks: Bookmark[]) =>
  Ether.newEther(
    bookmarkRepoSymbol,
    () => new InMemoryBookmarkRepository(bookmarks),
  );

export class InMemoryNoteAttachmentRepository
  implements NoteAttachmentRepository
{
  private readonly attachments: Map<NoteID, MediumID[]>;
  private readonly medium: Map<MediumID, Medium>;

  constructor(medium: Medium[], attachments: [NoteID, MediumID[]][]) {
    this.attachments = new Map(attachments);
    this.medium = new Map(medium.map((m) => [m.getId(), m]));
  }

  async create(
    noteID: NoteID,
    attachmentFileID: MediumID[],
  ): Promise<Result.Result<Error, void>> {
    if (!attachmentFileID.every((v) => this.medium.has(v))) {
      return Result.err(new Error('medium not found'));
    }

    this.attachments.set(noteID, attachmentFileID);
    return Result.ok(undefined);
  }

  async findByNoteID(noteID: NoteID): Promise<Result.Result<Error, Medium[]>> {
    const attachment = this.attachments.get(noteID);
    if (!attachment) {
      return Result.err(new Error('attachment not found'));
    }

    // ToDo: make filter more safe (may be fix at TypeScript 5.4)
    const res = attachment
      .map((id) => this.medium.get(id))
      .filter((v): v is Medium => Boolean(v));
    return Result.ok(res);
  }
}
export const inMemoryNoteAttachmentRepo = (
  medium: Medium[],
  attachments: [NoteID, MediumID[]][],
) =>
  Ether.newEther(
    noteAttachmentRepoSymbol,
    () => new InMemoryNoteAttachmentRepository(medium, attachments),
  );

type CompositeKey = `${NoteID}_${AccountID}`;
export class InMemoryReactionRepository implements ReactionRepository {
  private readonly reactions: Map<CompositeKey, Reaction>;

  constructor(reactions: Reaction[] = []) {
    this.reactions = new Map(
      reactions.map((r) => [
        this.compositeID({
          noteID: r.getNoteID(),
          accountID: r.getAccountID(),
        }),
        r,
      ]),
    );
  }

  private compositeID(id: {
    noteID: NoteID;
    accountID: AccountID;
  }): CompositeKey {
    return `${id.noteID}_${id.accountID}`;
  }

  private disassembleID(id: CompositeKey): {
    noteID: NoteID;
    accountID: AccountID;
  } {
    const [noteID, accountID] = id.split('_');
    if (!noteID || !accountID) throw new Error('Composite ID type invalid');
    return {
      noteID: noteID as NoteID,
      accountID: accountID as AccountID,
    };
  }

  async create(
    id: { noteID: NoteID; accountID: AccountID },
    body: string,
  ): Promise<Result.Result<Error, void>> {
    const reaction = Reaction.new({
      accountID: id.accountID,
      noteID: id.noteID,
      body,
    });

    if (
      Option.isSome(
        await this.findByID({ noteID: id.noteID, accountID: id.accountID }),
      )
    ) {
      return Result.err(new Error('already reacted'));
    }

    this.reactions.set(this.compositeID(id), reaction);
    return Result.ok(undefined);
  }
  findByID(id: { accountID: AccountID; noteID: NoteID }): Promise<
    Option.Option<Reaction>
  > {
    const reaction = Array.from(this.reactions.entries()).find(
      (v) => v[0] === this.compositeID(id),
    );

    return reaction
      ? Promise.resolve(Option.some(reaction[1]))
      : Promise.resolve(Option.none());
  }
  async reactionsByAccount(
    id: AccountID,
  ): Promise<Result.Result<Error, Reaction[]>> {
    const reactions = Array.from(this.reactions.entries())
      .filter((v) => this.disassembleID(v[0]).accountID === id)
      .map((v) => v[1]);

    return Result.ok(reactions);
  }
  async findByNoteID(id: NoteID): Promise<Result.Result<Error, Reaction[]>> {
    const reactions = [...this.reactions.entries()]
      .filter((v) => this.disassembleID(v[0]).noteID === id)
      .map((v) => v[1]);
    return Result.ok(reactions);
  }
  async deleteByID(id: { accountID: AccountID; noteID: NoteID }): Promise<
    Result.Result<Error, void>
  > {
    if (!this.reactions.has(this.compositeID(id)))
      return Result.err(
        new NoteNotReactedYetError('reaction not found', { cause: null }),
      );

    this.reactions.delete(this.compositeID(id));

    return Result.ok(undefined);
  }
}
export const inMemoryReactionRepo = (reactions: Reaction[]) =>
  Ether.newEther(
    reactionRepoSymbol,
    () => new InMemoryReactionRepository(reactions),
  );
