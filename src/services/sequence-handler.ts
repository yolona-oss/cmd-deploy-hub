import { Stack } from 'utils/struct/stack'
import { WithNeighbors } from 'types/with-neighbors'
import { DefaultSeqCommandsEnum } from 'constants/command'

interface ISequenceType {
    target: string
    prev: Array<string>
    next: Array<string>
}

export class SequenceHandler {
    private sequences: Map<string, Stack<string>>
    private handlingSeq: Array<ISequenceType>

    constructor(
        data: Array<{target: string}&Partial<WithNeighbors>>
    ) {
        this.sequences = new Map()
        // TODO safty check
        this.handlingSeq = data.map(item => {
            const cur = {
                target: item.target,
                prev: item.prev ? [item.prev] : [],
                next: item.next || []
            }

            let iterPrev = data.find(itm => itm.target == item.prev)
            for (iterPrev; iterPrev; iterPrev = data.find(itm => itm.target == iterPrev?.prev)) {
                cur.prev.unshift(iterPrev.target)
            }

            cur.prev = cur.prev.filter((v, i, a) => a.indexOf(v) == i)
            return cur
        })
    }

    private handleDefaultSeqCommands(command: string, selSequence: Stack<string>|undefined, seqId: string): string|void {
        switch (command) {
            case DefaultSeqCommandsEnum.NEXT_COMMAND:
                // TODO handle next if command seq allow this and no arguments or defaults provided
                break
            case DefaultSeqCommandsEnum.BACK_COMMAND:
                if (selSequence) {
                    if (selSequence.size() > 0) {
                        const prevCmd = this.sequences.get(String(seqId))!.pop()
                        return `You are backed to "${prevCmd}".`
                    }
                }
                return "You are not in a command sequence."
            case DefaultSeqCommandsEnum.CANCEL_COMMAND:
                if (selSequence) {
                    this.sequences.get(String(seqId))!.drop()
                    return "Sequence canceled."
                }
                return "You are not in a command sequence."
            default:
                return
        }
    }

    private addToSeq(seqId: string, target: string): void {
        this.sequences.get(seqId)!.push(target)
    }

    private dropSeq(seqId: string): void {
        this.sequences.get(seqId)!.drop()
    }

    private includesInSeq(seqId: string, targets: string[]): string[] {
        //return targets.every((target) => this.sequences.get(seqId)!.includes(target))
        const notIncludes = []
        for (const target of targets) {
            if (!this.sequences.get(seqId)!.includes(target)) {
                notIncludes.push(target)
            }
        }
        return notIncludes
    }

    // TODO
    public handle(seqId: number|string, command: string): string|void {
        seqId = String(seqId)
        const selSequence = this.sequences.get(seqId)
        const handlingSeq = this.handlingSeq.find((item) => item.target === command)

        const answer = this.handleDefaultSeqCommands(command, selSequence, seqId)
        if (answer) {
            return answer
        }

        if (!selSequence) {
            this.sequences.set(seqId, new Stack())
        }

        if (!handlingSeq) {
            return
        }

        const curHandlingSeq = this.handlingSeq.find((item) => item.target === command)!

        // standalone
        if (curHandlingSeq.prev.length == 0 && curHandlingSeq.next.length == 0) {
            return
        }

        // check if all prev exececuted
        const notExecuted = this.includesInSeq(seqId, curHandlingSeq.prev)
        if (notExecuted.length == 0) {
            this.addToSeq(seqId, command)
        } else {
            return `You are not executed all prev commands(${notExecuted.length}): ${notExecuted.join(', ')}.`
        }

        // command is last in sequence
        if (curHandlingSeq.next.length === 0) {
            this.dropSeq(seqId)
            return
        }
    }
}
