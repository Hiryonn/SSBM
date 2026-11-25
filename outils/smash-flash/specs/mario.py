SPEC = dict(
    name='Mario', sheet='xander_mario_sheet.png', credit='Xander / Rogultgot', region=(0, 0, 218, 580), sounds='Mario',
    anims=dict(
        idle=['3.0', '4.3'], walk='2.0-2.3', run=['3.3', '4.0', '4.1', '4.2'], crouch=['8.2'], jumpSquat=['8.2'],
        jump=['7.0'], doubleJump=['1.2', '1.0'], fall=['0.3'], land=['8.2'],
        shield=['8.1'], dodge=['8.0'], roll=['8.0', '8.1'], hurt=['8.3'], hurtAir=['9.1'], tumble=['1.0', '1.1', '1.3'],
        lie=['9.0'], getup=['8.2'], taunt=['0.1'], win=['0.1'],
        jab=['7.1', '7.2'], ftilt=['5.5', '5.6'], utilt=['9.3', '9.2'], dtilt=['8.2', '1.3'], dash=['0.0'],
        fsmash=['13.3', '13.2', '13.4'], usmash=['11.1', '11.2', '9.2'], dsmash=['14.0', '14.1'],
        nair=['1.0', '1.1'], fair=['0.0'], uair=['9.2'], dair=['1.3'],
        neutralB=['13.1', '13.4'], sideB=['7.3', '7.2'], upB=['11.0', '11.1', '11.2'], downB=['14.0', '14.1', '14.2', '14.3'],
        grab=['7.1'], proj=['13.0'],
    ),
    times=dict(fsmash=[6, 5, 10], upB=[4, 5, 10], downB=4, sideB=[8, 8], neutralB=[6, 12], idle=[16, 12]),
    proj_move=dict(move='neutralB', at=1, vx=4.5, vy=0.6, gravity=0.0, life=60, dmg=5, no_melee=True),
    moves=dict(downB=dict(vy=-1.5)),
    stats=dict(weight=100),
)
