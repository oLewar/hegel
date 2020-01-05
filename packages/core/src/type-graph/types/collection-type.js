// @flow
import { Type } from "./type";
import { TupleType } from "./tuple-type";
import { UnionType } from "./union-type";
import { GenericType } from "./generic-type";
import { getNameForType } from "../../utils/type-utils";
import { createTypeWithName } from "./create-type";
import type { Scope } from "../scope";
import type { TypeMeta } from "./type";

export class CollectionType<K: Type, V: Type> extends Type {
  static createTypeWithName = createTypeWithName(CollectionType);

  static getName(keyType: Type, valueType: Type) {
    return `{ [key: ${getNameForType(keyType)}]: ${getNameForType(
      valueType
    )} }`;
  }

  keyType: K;
  valueType: V;
  onlyLiteral = true;

  constructor(name: string, keyType: K, valueType: V, meta?: TypeMeta = {}) {
    super(name, meta);
    this.keyType = keyType;
    this.valueType = valueType;
  }

  getPropertyType(propertyName: mixed, isForAssign: boolean = false): ?Type {
    if (
      typeof propertyName === this.keyType.name ||
      propertyName === this.keyType.name
    ) {
      if (isForAssign) {
        return this.valueType;
      }
      const UNDEFINED = new Type("undefined", { isSubtypeOf: new Type("void") });
      const result =
        this.valueType instanceof UnionType &&
        this.valueType.variants.some(a => a.name === "undefined")
          ? this.valueType
          : new UnionType(
              UnionType.getName([this.valueType, UNDEFINED]),
              [this.valueType, UNDEFINED]
            );
      if (result) {
        return result;
      }
    }
    return super.getPropertyType(propertyName);
  }

  equalsTo(anotherType: Type) {
    anotherType = this.getOponentType(anotherType);
    if (this.referenceEqualsTo(anotherType)) {
      return true;
    }

    return (
      anotherType instanceof CollectionType &&
      super.equalsTo(anotherType) &&
      this.keyType.equalsTo(anotherType.keyType) &&
      this.valueType.equalsTo(anotherType.valueType)
    );
  }

  isSuperTypeFor(anotherType: any) {
    anotherType = this.getOponentType(anotherType);
    const selfNameWithoutApplying = GenericType.getNameWithoutApplying(
      this.name
    );
    const otherfNameWithoutApplying = GenericType.getNameWithoutApplying(
      anotherType.name
    );
    return (
      (anotherType instanceof CollectionType &&
        selfNameWithoutApplying === otherfNameWithoutApplying &&
        this.keyType.equalsTo(anotherType.keyType) &&
        this.valueType.isPrincipalTypeFor(anotherType.valueType)) ||
      (anotherType instanceof TupleType &&
        (anotherType.isSubtypeOf === null ||
          selfNameWithoutApplying ===
            GenericType.getNameWithoutApplying(anotherType.isSubtypeOf.name)) &&
        this.keyType.equalsTo(new Type("number")) &&
        anotherType.items.every(t => this.valueType.isPrincipalTypeFor(t)))
    );
  }

  changeAll(
    sourceTypes: Array<Type>,
    targetTypes: Array<Type>,
    typeScope: Scope
  ) {
    const newValueType = this.valueType.changeAll(
      sourceTypes,
      targetTypes,
      typeScope
    );
    const isSubtypeOf =
      this.isSubtypeOf &&
      this.isSubtypeOf.changeAll(sourceTypes, targetTypes, typeScope);
    if (newValueType === this.valueType && isSubtypeOf === this.isSubtypeOf) {
      return this;
    }
    return new CollectionType<Type, Type>(
      this.getChangedName(sourceTypes, targetTypes),
      this.keyType,
      newValueType,
      { isSubtypeOf }
    );
  }

  getDifference(type: Type) {
    type = this.getOponentType(type);
    if (type instanceof CollectionType) {
      const keyDiff = this.keyType.getDifference(type.keyType);
      const valueDiff = this.valueType.getDifference(type.valueType);
      return keyDiff.concat(valueDiff);
    }
    return super.getDifference(type);
  }

  contains(type: Type) {
    return (
      super.contains(type) ||
      this.keyType.contains(type) ||
      this.valueType.contains(type)
    );
  }

  weakContains(type: Type) {
    return (
      super.contains(type) ||
      this.keyType.weakContains(type) ||
      this.valueType.weakContains(type)
    );
  }

  makeNominal() {
    // $FlowIssue
    this.isSubtypeOf.makeNominal();
  }
}
