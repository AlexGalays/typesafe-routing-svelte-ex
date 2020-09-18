import * as v from 'validation.ts'

export type UserId = string & {_tag: 'UserId'}

export const userId = v.string.tagged<UserId>()