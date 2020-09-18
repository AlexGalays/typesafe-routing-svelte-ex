import {string, Ok, Err} from 'validation.ts'

export const intFromString = string.flatMap(str => {
  const num = +str
  return Number.isInteger(num) ? Ok(num) : Err('Expected int, got:' + str)
})